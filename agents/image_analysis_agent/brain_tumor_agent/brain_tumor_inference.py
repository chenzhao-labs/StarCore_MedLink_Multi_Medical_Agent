import os
from collections import OrderedDict
import cv2
import torch
import torch.nn as nn
import logging
import numpy as np
import matplotlib.pyplot as plt
from .model_download import download_model_checkpoint

logger = logging.getLogger(__name__)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info("Using device: %s", DEVICE)


def _double_conv(in_ch, out_ch, prefix):
    """Two conv+bn+relu blocks with named submodules matching mateuszbuda U-Net."""
    return nn.Sequential(OrderedDict([
        (prefix + "conv1", nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False)),
        (prefix + "norm1", nn.BatchNorm2d(out_ch)),
        ("relu1", nn.ReLU(inplace=True)),
        (prefix + "conv2", nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False)),
        (prefix + "norm2", nn.BatchNorm2d(out_ch)),
        ("relu2", nn.ReLU(inplace=True)),
    ]))


class UNet(nn.Module):
    """U-Net compatible with mateuszbuda/brain-segmentation-pytorch checkpoint."""

    def __init__(self, in_channels=3, out_channels=1, init_features=32):
        super().__init__()
        f = init_features

        self.encoder1 = _double_conv(in_channels, f, "enc1")
        self.pool1 = nn.MaxPool2d(2, 2)
        self.encoder2 = _double_conv(f, f * 2, "enc2")
        self.pool2 = nn.MaxPool2d(2, 2)
        self.encoder3 = _double_conv(f * 2, f * 4, "enc3")
        self.pool3 = nn.MaxPool2d(2, 2)
        self.encoder4 = _double_conv(f * 4, f * 8, "enc4")
        self.pool4 = nn.MaxPool2d(2, 2)

        self.bottleneck = _double_conv(f * 8, f * 16, "bottleneck")

        self.upconv4 = nn.ConvTranspose2d(f * 16, f * 8, kernel_size=2, stride=2)
        self.decoder4 = _double_conv(f * 16, f * 8, "dec4")
        self.upconv3 = nn.ConvTranspose2d(f * 8, f * 4, kernel_size=2, stride=2)
        self.decoder3 = _double_conv(f * 8, f * 4, "dec3")
        self.upconv2 = nn.ConvTranspose2d(f * 4, f * 2, kernel_size=2, stride=2)
        self.decoder2 = _double_conv(f * 4, f * 2, "dec2")
        self.upconv1 = nn.ConvTranspose2d(f * 2, f, kernel_size=2, stride=2)
        self.decoder1 = _double_conv(f * 2, f, "dec1")

        self.conv = nn.Conv2d(f, out_channels, kernel_size=1)

    def forward(self, x):
        enc1 = self.encoder1(x)
        enc2 = self.encoder2(self.pool1(enc1))
        enc3 = self.encoder3(self.pool2(enc2))
        enc4 = self.encoder4(self.pool3(enc3))

        bottleneck = self.bottleneck(self.pool4(enc4))

        dec4 = self.upconv4(bottleneck)
        dec4 = torch.cat((dec4, enc4), dim=1)
        dec4 = self.decoder4(dec4)
        dec3 = self.upconv3(dec4)
        dec3 = torch.cat((dec3, enc3), dim=1)
        dec3 = self.decoder3(dec3)
        dec2 = self.upconv2(dec3)
        dec2 = torch.cat((dec2, enc2), dim=1)
        dec2 = self.decoder2(dec2)
        dec1 = self.upconv1(dec2)
        dec1 = torch.cat((dec1, enc1), dim=1)
        dec1 = self.decoder1(dec1)

        return torch.sigmoid(self.conv(dec1))


class BrainTumorSegmentation:
    """Brain tumor segmentation using mateuszbuda/brain-segmentation-pytorch U-Net weights."""

    def __init__(self, model_path, gdrive_file_id=None):
        self.model_path = model_path
        self.gdrive_file_id = gdrive_file_id
        self.device = DEVICE
        self.model = None
        self.output_dir = os.path.join("uploads", "brain_tumor_output")
        os.makedirs(self.output_dir, exist_ok=True)

    def _ensure_model(self):
        if self.model is not None:
            return True

        if self.gdrive_file_id:
            ok = download_model_checkpoint(self.gdrive_file_id, self.model_path)
            if not ok:
                logger.error("Brain tumor model download failed.")
                return False

        if not os.path.exists(self.model_path):
            logger.error("Brain tumor model not found at %s", self.model_path)
            return False

        try:
            checkpoint = torch.load(self.model_path, map_location=self.device)

            if isinstance(checkpoint, dict):
                model = UNet(in_channels=3, out_channels=1, init_features=32)
                model.load_state_dict(checkpoint, strict=True)
            else:
                model = checkpoint.to(self.device)

            model.eval()
            self.model = model
            logger.info("Brain tumor model loaded from %s", self.model_path)
            return True
        except Exception as e:
            logger.error("Error loading brain tumor model: %s", e)
            return False

    def predict(self, image_path):
        """Segment brain tumor in an MRI image. Returns dict with output_path and metrics."""
        if not self._ensure_model():
            raise RuntimeError(
                "Brain tumor model could not be loaded. "
                "Ensure the model file exists at: " + self.model_path
            )

        img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        original_h, original_w = img_rgb.shape[:2]

        img_resized = cv2.resize(img_rgb, (256, 256)) / 255.0
        img_tensor = (
            torch.Tensor(img_resized).unsqueeze(0).permute(0, 3, 1, 2).to(self.device)
        )

        with torch.no_grad():
            mask = self.model(img_tensor).squeeze().cpu().numpy()

        mask_resized = cv2.resize(mask, (original_w, original_h))
        mask_binary = (mask_resized > 0.5).astype(np.uint8)

        tumor_pixel_count = np.sum(mask_binary)
        total_pixels = mask_binary.size
        tumor_ratio = tumor_pixel_count / total_pixels if total_pixels > 0 else 0

        output_path = os.path.join(self.output_dir, "brain_tumor_segmentation.png")
        fig, ax = plt.subplots(figsize=(10, 10))
        ax.axis("off")
        ax.imshow(img_rgb)
        if tumor_pixel_count > 0:
            mask_rgba = np.zeros((original_h, original_w, 4))
            mask_rgba[..., 0] = 1.0
            mask_rgba[..., 3] = mask_binary * 0.4
            ax.imshow(mask_rgba)
        plt.savefig(output_path, bbox_inches="tight")
        plt.close(fig)

        logger.info(
            "Brain tumor segmentation complete. Tumor ratio: %.2f%%. Output: %s",
            tumor_ratio * 100,
            output_path,
        )

        return {
            "output_path": output_path,
            "tumor_ratio": round(tumor_ratio * 100, 2),
            "has_tumor": tumor_pixel_count > 0,
        }
