// ================= LOGOUT =================
function logout() {
    // Redirige a la ruta de Flask que limpia la sesión
    window.location.href = "/logout";
}

// ================= LOGIN & REGISTRO =================
// (Se mantienen igual pero con validaciones básicas)

function login() {
    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;

    if (!correo || !password) {
        alert("Por favor llena todos los campos");
        return;
    }

    fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            window.location.href = "/panel";
        } else {
            alert("Credenciales incorrectas");
        }
    })
    .catch(err => console.error("Error en login:", err));
}

function registrar() {
    const nombre = document.getElementById("nombre").value;
    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const tipo = document.getElementById("tipo").value;

    fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, password, tipo })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            alert("¡Registro exitoso! Ya puedes iniciar sesión.");
            window.location.href = "/";
        } else {
            alert(data.error || "Error al registrar");
        }
    })
    .catch(err => console.error("Error en registro:", err));
}

// Navegación simple
function irRegistro() { window.location.href = "/registro"; }
function irLogin() { window.location.href = "/"; }

// ================= INICIALIZACIÓN =================
// Arranca el ciclo de actualización por primera vez
document.addEventListener("DOMContentLoaded", () => {
    // Solo ejecutamos la actualización si estamos en el panel (donde existe el contenedor)
    if (document.getElementById("contenedor")) {
        // La actualización ya está manejada por index.html
        console.log("Dashboard JS cargado - actualización desde index.html");
    }
});