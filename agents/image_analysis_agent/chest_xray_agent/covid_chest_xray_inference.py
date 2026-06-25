import os
import logging
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from torch.autograd import Variable
from PIL import Image
import numpy as np

from .model_download import download_model_checkpoint


class ChestXRayClassification:
    def __init__(self, model_path, gdrive_file_id=None, device=None):
        self.logger = logging.getLogger(__name__)

        self.class_names = ["covid19", "normal"]
        self.model_path = model_path
        self.gdrive_file_id = gdrive_file_id
        self.device = device if device else torch.device(
            "cuda:0" if torch.cuda.is_available() else "cpu"
        )
        self.logger.info("Using device: %s", self.device)

        self.model = None

        self.mean_nums = [0.485, 0.456, 0.406]
        self.std_nums = [0.229, 0.224, 0.225]
        self.transform = transforms.Compose([
            transforms.Resize((150, 150)),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.mean_nums, std=self.std_nums),
        ])

    def _build_model(self):
        model = models.densenet121(weights=None)
        num_ftrs = model.classifier.in_features
        model.classifier = nn.Linear(num_ftrs, len(self.class_names))
        return model

    def _ensure_model(self):
        if self.model is not None:
            return True

        if self.gdrive_file_id:
            ok = download_model_checkpoint(self.gdrive_file_id, self.model_path)
            if not ok:
                self.logger.error(
                    "Chest X-ray model not available. "
                    "Chest X-ray classification will be disabled."
                )
                return False

        if not os.path.exists(self.model_path):
            self.logger.error(
                "Chest X-ray model not found at %s", self.model_path
            )
            return False

        try:
            model = self._build_model()
            model.load_state_dict(
                torch.load(self.model_path, map_location=self.device)
            )
            model.to(self.device)
            model.eval()
            self.model = model
            self.logger.info("Model loaded successfully from %s", self.model_path)
            return True
        except Exception as e:
            self.logger.error("Error loading model: %s", e)
            return False

    def predict(self, img_path):
        if not self._ensure_model():
            return None

        image = Image.open(img_path).convert("RGB")
        image_tensor = self.transform(image).unsqueeze(0)
        input_tensor = Variable(image_tensor).to(self.device)

        with torch.no_grad():
            out = self.model(input_tensor)
            _, preds = torch.max(out, 1)
            idx = preds.cpu().numpy()[0]
            pred_class = self.class_names[idx]

        self.logger.info("Predicted Class: %s", pred_class)
        return pred_class
