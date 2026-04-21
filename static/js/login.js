function login() {
    fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            correo:   document.getElementById("correo").value,
            password: document.getElementById("password").value
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            window.location.href = "/panel";    // Flask maneja la sesión
        } else {
            alert("Correo o contraseña incorrectos");
        }
    })
    .catch(err => {
        alert("Error de conexión con el servidor");
        console.error(err);
    });
}

function irRegistro() {
    window.location.href = "/registro";
}