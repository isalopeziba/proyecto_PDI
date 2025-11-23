function enviarImagen() {
    const input = document.getElementById("imageInput");
    const file = input.files[0];
    const canvas = document.getElementById("canvas");

    if (!file) {
        alert("Por favor selecciona una imagen.");
        return;
    }

    
    // LIMPIAR RESULTADOS ANTERIORES
    limpiarResultados();

    // Mostrar mensaje "Analizando..."
    mostrarAnalizando();



    // FormData con la clave correcta: "image"
    const formData = new FormData();
    formData.append("image", file);


    // Enviar al backend Flask
    fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        body: formData
    })
        .then(res => {
            if (!res.ok) throw new Error("Error en el servidor");
            return res.json();
        })
        .then(data => {
            const resultDiv = document.getElementById("result");
            resultDiv.style.display = "block";

            resultDiv.innerHTML = `
            <b>Clasificación:</b> ${data.prediction}<br>
            <b>ID de clase:</b> ${data.class_id}
        `;
            // Cambiar color del contenedor derecho según el resultado
            actualizarColorContainer(data.prediction);


            const preview = document.getElementById("preview");
            const canvas = document.getElementById("canvas");


            dibujarSoloImagen(preview);

            // Mostrar canvas aunque no haya cajas
            canvas.style.display = "block";

            // Dibujar cajas de basura si existen
            if (data.basura_boxes && data.basura_boxes.length > 0) {
                dibujarCajas(preview, data.basura_boxes, "yellow");
            }

            // Dibujar cajas de huecos si existen
            if (data.huecos_boxes && data.huecos_boxes.length > 0) {
                dibujarCajas(preview, data.huecos_boxes, "red");
            }

            // Seleccionar texto oculto
            const infoText = document.getElementById("info-text");

            // Limpiar clases anteriores
            infoText.classList.remove("info-calle-buena", "info-grietas", "info-huecos");

            // Cambiar texto y estilo según la predicción
            if (data.prediction === "Calle_Buena") {
                infoText.innerText = "La calle se encuentra en buen estado. No se requieren reportes.";
                infoText.classList.add("info-calle-buena");
            }

            else if (data.prediction === "Grietas") {
                infoText.innerText = "Se detectaron grietas en la superficie. Se recomienda reportar para reparación preventiva.";
                infoText.classList.add("info-grietas");
            }

            else if (data.prediction === "Huecos") {
                infoText.innerText = "Se detectaron huecos en la vía. Es importante reportarlo para evitar accidentes.";
                infoText.classList.add("info-huecos");
            }

            // Mostrar texto
            infoText.style.display = "block";
            // ⭐ AQUÍ: llamar mapa (EXIF)
            procesarExif(file);

        })
        .catch(error => {
            console.error("❌ Error:", error);
            alert("Hubo un problema al enviar la imagen.");
        });




}





function dibujarCajas(imageElement, boxes, color = "red") {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    // igualar tamaño a la resolución REAL de la imagen
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;

    // mostrar canvas
    canvas.style.display = "block";
    // limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // dibujar la imagen original
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    // configurar estilo
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;

    // recorrer todas las cajas
    boxes.forEach(box => {
        const [x1, y1, x2, y2] = box;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    });
}
function dibujarSoloImagen(imageElement) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
}


document.getElementById("imageInput").addEventListener("change", function () {
    const file = this.files[0];
    const preview = document.getElementById("preview");

    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";

    }
});


function actualizarColorContainer(pred) {
    const container = document.getElementById("right-container");

    // Quitar colores anteriores
    container.classList.remove("result-buena", "result-grietas", "result-huecos");

    // Normalizar predicción a minúsculas
    const p = pred.toLowerCase();

    if (p.includes("calle") || p.includes("buena")) {
        container.classList.add("result-buena");
    }
    else if (p.includes("grieta")) {
        container.classList.add("result-grietas");
    }
    else if (p.includes("hueco")) {
        container.classList.add("result-huecos");
    }
}

function procesarExif(file) {
    document.getElementById("mapContainer").style.display = "none";
    document.getElementById("noLocation").style.display = "none";

    EXIF.getData(file, function () {

        // Intentar obtener coordenadas desde varios lugares posibles
        let lat = EXIF.getTag(this, "GPSLatitude");
        let lon = EXIF.getTag(this, "GPSLongitude");
        let latRef = EXIF.getTag(this, "GPSLatitudeRef");
        let lonRef = EXIF.getTag(this, "GPSLongitudeRef");

        // A veces está en GPSInfo
        const gpsInfo = EXIF.getTag(this, "GPSInfo");
        if (gpsInfo) {
            lat = lat || gpsInfo.GPSLatitude;
            lon = lon || gpsInfo.GPSLongitude;
            latRef = latRef || gpsInfo.GPSLatitudeRef;
            lonRef = lonRef || gpsInfo.GPSLongitudeRef;
        }

        // A veces está bajo otras etiquetas raras
        lat = lat || EXIF.getTag(this, "GPSDestLatitude");
        lon = lon || EXIF.getTag(this, "GPSDestLongitude");
        latRef = latRef || EXIF.getTag(this, "GPSDestLatitudeRef");
        lonRef = lonRef || EXIF.getTag(this, "GPSDestLongitudeRef");

        // Si aun así no hay coordenadas
        if (!lat || !lon || !latRef || !lonRef) {
            document.getElementById("noLocation").style.display = "block";
            return;
        }

        // Convertir coordenadas a decimal
        function convertirAdecimal(coord, ref) {
            const grados = coord[0].numerator / coord[0].denominator;
            const minutos = coord[1].numerator / coord[1].denominator;
            const segundos = coord[2].numerator / coord[2].denominator;

            let decimal = grados + minutos / 60 + segundos / 3600;
            if (ref === "S" || ref === "W") decimal = -decimal;

            return decimal;
        }

        const latDec = convertirAdecimal(lat, latRef);
        const lonDec = convertirAdecimal(lon, lonRef);

        mostrarMapa(latDec, lonDec);
    });
}

function mostrarMapa(lat, lon) {
    document.getElementById("mapContainer").style.display = "block";

    // borrar mapa anterior si ya existía
    if (window.mapa) window.mapa.remove();

    window.mapa = L.map("map").setView([lat, lon], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(window.mapa);

    L.marker([lat, lon])
        .addTo(window.mapa)
        .bindPopup("Ubicación detectada")
        .openPopup();
}

function limpiarResultados() {

    // Ocultar texto
    const infoText = document.getElementById("info-text");
    infoText.style.display = "none";
    infoText.innerText = "";

    // Limpiar canvas
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = "none";

    // Borrar resultado
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";
    resultDiv.style.display = "none";

    // Quitar colores del contenedor derecho
    const container = document.getElementById("right-container");
    container.classList.remove("result-buena", "result-grietas", "result-huecos");

    // Ocultar mapa
    document.getElementById("mapContainer").style.display = "none";
    document.getElementById("noLocation").style.display = "none";
}

function mostrarAnalizando() {
    const resultDiv = document.getElementById("result");
    resultDiv.style.display = "block";

    resultDiv.innerHTML = `
        <div class="loading">Analizando imagen...</div>
    `;
}