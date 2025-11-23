function enviarImagen() {
    const input = document.getElementById("imageInput");
    const file = input.files[0];
    const canvas = document.getElementById("canvas");

    if (!file) {
        alert("Por favor selecciona una imagen.");
        return;
    }

    // Mostrar imagen seleccionada
    const preview = document.getElementById("preview");
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";

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
        const preview = document.getElementById("preview");

        dibujarSoloImagen(preview);
        // Dibujar cajas de basura si existen
        if (data.basura_boxes && data.basura_boxes.length > 0) {
            dibujarCajas(preview, data.basura_boxes, "yellow");
        }

        // Dibujar cajas de huecos si existen
        if (data.huecos_boxes && data.huecos_boxes.length > 0) {
            dibujarCajas(preview, data.huecos_boxes, "red");
        }
    })
    .catch(error => {
        console.error("❌ Error:", error);
        alert("Hubo un problema al enviar la imagen.");
    });

    console.log("hola");
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
