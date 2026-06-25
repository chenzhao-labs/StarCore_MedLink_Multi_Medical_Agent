import os
import logging
import gdown

logger = logging.getLogger(__name__)

GDOWN_TIMEOUT = 30


def download_model_checkpoint(gdrive_file_id, output_path):
    """
    Download model checkpoint from Google Drive if it doesn't exist.

    Returns True if the model file is available (pre-existing or downloaded),
    False if download failed (e.g. network blocked).
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if os.path.exists(output_path):
        return True

    logger.info("Downloading brain tumor model to %s...", output_path)
    logger.warning("If download times out, download the file manually and place it at the path above.")
    url = f"https://drive.google.com/uc?id={gdrive_file_id}"
    try:
        gdown.download(url, output_path, quiet=False, timeout=GDOWN_TIMEOUT)
        logger.info("Download complete!")
        return True
    except Exception as e:
        logger.error("Download failed: %s", e)
        logger.info("Please manually download from: %s", url)
        logger.info("And place it at: %s", output_path)
        return False
