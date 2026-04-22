// ================= VALIDACIONES =================
function validarEmailFront(email) {
    const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return patron.test(email);
}

function mostrarError(elementId, mensaje) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = mensaje;
        el.style.display = mensaje ? 'block' : 'none';
    }
}

function limpiarErrores() {
    document.getElementById("errorCorreo").textContent = "";
    document.getElementById("errorPassword").textContent = "";
    document.getElementById("authError").textContent = "";
}

// ================= LOGIN =================
function login() {
    limpiarErrores();
    
    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;

    // Validaciones locales
    let valido = true;

    if (!correo) {
        mostrarError("errorCorreo", "El correo es requerido");
        valido = false;
    } else if (!validarEmailFront(correo)) {
        mostrarError("errorCorreo", "Correo inválido");
        valido = false;
    }

    if (!password) {
        mostrarError("errorPassword", "La contraseña es requerida");
        valido = false;
    }

    if (!valido) return;

    // Enviar al servidor
    fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            // ✅ Guardar en localStorage
            localStorage.setItem("id_usuario", data.id);
            localStorage.setItem("nombre", data.nombre);
            localStorage.setItem("tipo", data.tipo);
            
            window.location.href = "/panel";
        } else {
            mostrarError("authError", data.error || "Error al iniciar sesión");
        }
    })
    .catch(err => {
        mostrarError("authError", "Error de conexión con el servidor");
        console.error(err);
    });
}

function irRegistro() {
    window.location.href = "/registro";
}