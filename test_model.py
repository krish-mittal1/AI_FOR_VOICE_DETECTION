from keras import models
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "app", "model", "final_model.keras")

print("Loading from:", MODEL_PATH)

model = models.load_model(MODEL_PATH)
print("✅ Model loaded successfully")
