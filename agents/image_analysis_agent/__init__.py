from .image_classifier import ImageClassifier
from .chest_xray_agent.covid_chest_xray_inference import ChestXRayClassification
from .brain_tumor_agent.brain_tumor_inference import BrainTumorSegmentation
from .skin_lesion_agent.skin_lesion_inference import SkinLesionSegmentation


class ImageAnalysisAgent:
    """
    Agent responsible for processing image uploads and classifying them as medical or non-medical, and determining their type.
    """

    def __init__(self, config):
        cv = config.medical_cv
        self.image_classifier = ImageClassifier(vision_model=cv.llm)
        self.chest_xray_agent = ChestXRayClassification(
            model_path=cv.chest_xray_model_path,
            gdrive_file_id=cv.chest_xray_gdrive_id or None,
        )
        self.brain_tumor_agent = BrainTumorSegmentation(
            model_path=cv.brain_tumor_model_path,
            gdrive_file_id=cv.brain_tumor_gdrive_id or None,
        )
        self.skin_lesion_agent = SkinLesionSegmentation(
            model_path=cv.skin_lesion_model_path,
            gdrive_file_id=cv.skin_lesion_gdrive_id or None,
        )
        self.skin_lesion_segmentation_output_path = cv.skin_lesion_segmentation_output_path

    def analyze_image(self, image_path: str) -> str:
        """Classifies images as medical or non-medical and determines their type."""
        return self.image_classifier.classify_image(image_path)

    def classify_chest_xray(self, image_path: str) -> str:
        return self.chest_xray_agent.predict(image_path)

    def segment_brain_tumor(self, image_path: str) -> dict:
        return self.brain_tumor_agent.predict(image_path)

    def segment_skin_lesion(self, image_path: str) -> str:
        return self.skin_lesion_agent.predict(image_path, self.skin_lesion_segmentation_output_path)
