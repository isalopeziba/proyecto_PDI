# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import json
import traceback
import logging
import numpy as np
from ultralytics import YOLO


# ---------------------------
# Logging
# ---------------------------
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("safe_route_api")

# ---------------------------
# Flask + CORS
# ---------------------------
app = Flask(__name__)
CORS(app)

# ---------------------------
# Modelo (misma arquitectura que entrenaste)
# ---------------------------
class CNN(nn.Module):
    def __init__(self):
        super(CNN, self).__init__()
        self.dropout = nn.Dropout(0.5)

        self.conv1 = nn.Conv2d(3, 32, 3, 1, 1)
        self.pool1 = nn.MaxPool2d(2)

        self.conv2 = nn.Conv2d(32, 64, 3, 1, 1)
        self.pool2 = nn.MaxPool2d(2)

        self.conv3 = nn.Conv2d(64, 128, 3, 1, 1)
        self.pool3 = nn.MaxPool2d(2)

        # Nota: la fc1 debe coincidir con el tamaño usado en entrenamiento (224 -> 28)
        self.fc1 = nn.Linear(128 * 28 * 28, 256)
        self.fc2 = nn.Linear(256, 512)
        self.fc3 = nn.Linear(512, 3)

    def forward(self, x):
        x = self.pool1(F.relu(self.conv1(x)))
        x = self.pool2(F.relu(self.conv2(x)))
        x = self.pool3(F.relu(self.conv3(x)))
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.fc3(x)
        return x

# ---------------------------
# Cargar clases (asegúrate que el orden coincida con el entrenamiento)
# ---------------------------
with open("classes.json", "r", encoding="utf-8") as f:
    classes = json.load(f)
# classes debe ser lista: ["Calle_Buena","Grietas","Huecos"]
if not isinstance(classes, list):
    raise ValueError("classes.json debe contener una lista con los nombres de las clases en el mismo orden del entrenamiento.")

log.info(f"Clases cargadas: {classes}")

# ---------------------------
# Device y carga del modelo
# ---------------------------
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = "modeloPre.pt"

model = CNN()
state = torch.load(MODEL_PATH, map_location=DEVICE)
model.load_state_dict(state)
model.to(DEVICE)
model.eval()
log.info(f"Modelo cargado en {DEVICE} desde {MODEL_PATH}")

# ---------------------------
# Transforms EXACTOS como en entrenamiento
# ---------------------------
mean = [0.485, 0.456, 0.406]
std  = [0.229, 0.224, 0.225]

transform = transforms.Compose([
    transforms.Resize((224, 224)),        # mismo tamaño de entrenamiento
    transforms.ToTensor(),
    transforms.Normalize(mean, std)       # misma normalización usada en entrenamiento
])
yolo_basura = YOLO("best_basura.pt")
yolo_huecos = YOLO("best_huecos.pt")
log.info("Modelos YOLO cargados: best_basura.pt y best_huecos.pt")

#-----------------------------
#Preprocesamiento
#-----------------------------
def convolution2d(image, kernel):
    if len(image.shape) == 2:
        image = np.expand_dims(image, axis=2)

    output = np.zeros_like(image)
    image_padded = np.pad(image, ((1, 1), (1, 1), (0, 0)), mode='constant')

    for c in range(image.shape[2]):
        for y in range(image.shape[0]):
            for x in range(image.shape[1]):
                output[y, x, c] = (kernel * image_padded[y:y+3, x:x+3, c]).sum()
    return output

# Kernel para resaltar bordes
edge_kernel = np.array([
    [-1, -1, -1],
    [-1,  9, -1],
    [-1, -1, -1]
])
# ---------------------------
# Endpoint /predict
# ---------------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        log.info("Petición /predict recibida")
        if "image" not in request.files:
            log.warning("No se recibió 'image' en request.files")
            return jsonify({"error": "Se requiere una imagen con la clave 'image'"}), 400

        file = request.files["image"]
        if file.filename == "":
            log.warning("Archivo con filename vacío")
            return jsonify({"error": "Archivo vacío"}), 400

        # Abrir imagen y transformar exactamente como en entrenamiento
        img = Image.open(file.stream).convert("RGB")
        img_t = transform(img).unsqueeze(0)               # 1 x C x H x W
        img_t = img_t.to(DEVICE)

        #--------------------------------------------------------------------
        #Hacer el preprosesamiento
        #------------------------------------------------------------------
        img_np = np.array(img)
        image_edge= convolution2d(img_np, edge_kernel)
        image_edge = transform(img).unsqueeze(0)               # 1 x C x H x W
        image_edge = img_t.to(DEVICE)

        with torch.no_grad():
            outputs = model(image_edge)                        # logits
            probs = F.softmax(outputs, dim=1).cpu().numpy()[0]
            pred_idx = int(probs.argmax())
            pred_label = classes[pred_idx]

        log.info(f"Predicción: idx={pred_idx}, label={pred_label}, probs={probs.tolist()}")



        #-----------------------------------------
        #Modelo YOLO basura
        #------------------------------------------

        try:
            #results_basura = yolo_basura.predict(source=img, conf=0.02)
            results_basura = yolo_basura(img)
            basura_boxes = results_basura[0].boxes.xyxy.cpu().numpy().tolist()
        except:
            basura_boxes = []


        # --------------------------------------
        # 2. Si es "Huecos", aplicamos YOLO
        # --------------------------------------
        huecos_boxes = []

        if pred_label == "Huecos":
            try:
                results_huecos = yolo_huecos(img)
                huecos_boxes = results_huecos[0].boxes.xyxy.cpu().numpy().tolist()
            except:
                huecos_boxes = []


 
        return jsonify({
            "prediction": pred_label,
            "class_id": pred_idx,
            "probabilities": probs.tolist(),
            "classes": classes,
            "basura_boxes": basura_boxes,
            "huecos_boxes": huecos_boxes
        })
    except Exception as e:
        # registrar el stacktrace en consola para depuración
        tb = traceback.format_exc()
        log.error(f"Error en /predict: {e}\n{tb}")
        # devolver info mínima al cliente (no exponer stack completo en prod)
        return jsonify({"error": "Error interno en el servidor", "detail": str(e)}), 500

# ---------------------------
# Run
# ---------------------------
if __name__ == "__main__":
    log.info("Iniciando servidor Flask...")
    app.run(debug=True, host="127.0.0.1", port=5000)
