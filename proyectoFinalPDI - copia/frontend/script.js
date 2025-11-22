function enviarImagen() {
    const input = document.getElementById("imageInput");
    const file = input.files[0];

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
    })
    .catch(error => {
        console.error("❌ Error:", error);
        alert("Hubo un problema al enviar la imagen.");
    });

    console.log("hola");
}