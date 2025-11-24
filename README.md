# proyecto_PDI
SafeRoute es una aplicación web que permite clasificar el estado de una calle (Calle Buena, Grietas o Huecos) mediante una red neuronal CNN y detectar anomalías con un modelo YOLO.
Además, extrae la ubicación GPS desde los metadatos EXIF de la fotografía y la muestra en un mapa interactivo con Leaflet.
[![Mira el video](https://github.com/isalopeziba/proyecto_PDI/blob/cfb921eb286b9a0562bf7c83e2962cf0d13eff16/img1.png)](https://youtu.be/rF0Ey38kHU4)

Este repositorio integra:

- Frontend en HTML, CSS y JavaScript
- Backend en Python + Flask
- Modelo de IA para clasificación y detección
- Lectura de ubicación GPS en EXIF
- Visualización de anomalías mediante Canvas
- Mapa interactivo (Leaflet)

### Instrucciones de Ejecución
1 **Descargar el proyecto** <br>
    Descarga o clona el repositorio de GitHub.
    Asegúrate de tener Python 3.8 – 3.11, ya que Ultralytics no funciona en Python 3.12. o versiones mayores

2️ **Crear y activar el entorno virtual (venv)** <br>
Dentro de la carpeta del backend, abre la terminal y ejecuta:
    python -m venv venv
Activa el entorno:
    venv\Scripts\activate

3️ **Instalar las dependencias necesarias** <br>
  Con el entorno activado, instala todo lo necesario:
      pip install flask ultralytics torch torchvision pillow opencv-python exifread flask-cors
      
4️ **Ejecutar el servidor Flask para poder tener el backend activo en el localhost** <br>
En la terminal (dentro del venv):
    python app.py
Si todo está correcto, verás un mensaje similar a:
    Running on http://127.0.0.1:5000
    
5️ **Abrir el frontend con el open server** <br>
Ve a la carpeta del frontend. y abre el archivo: index.html

