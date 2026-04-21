function registrar() {
    fetch("/api/registro", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nombre:   document.getElementById("nombre").value,
            correo:   document.getElementById("correo").value,
            password: document.getElementById("password").value,
            tipo:     document.getElementById("tipo").value
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            alert("Registrado correctamente");
            window.location.href = "/";
        } else {
            alert(data.error || "Error al registrar");
        }
    })
    .catch(err => {
        alert("Error de conexión con el servidor");
        console.error(err);
    });
}

function irLogin() {
    window.location.href = "/";
}