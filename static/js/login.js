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
    console.log("🔓 Iniciando login...");
    
    // Limpiar errores previos
    const errorCorreoEl = document.getElementById("errorCorreo");
    const errorPasswordEl = document.getElementById("errorPassword");
    const authErrorEl = document.getElementById("authError");
    
    if (errorCorreoEl) errorCorreoEl.textContent = "";
    if (errorPasswordEl) errorPasswordEl.textContent = "";
    if (authErrorEl) authErrorEl.textContent = "";
    
    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;

    console.log("✓ Correo:", correo);
    console.log("✓ Contraseña:", password ? "***" : "vacía");

    // Validaciones locales
    let valido = true;

    if (!correo) {
        const msg = "El correo es requerido";
        if (errorCorreoEl) errorCorreoEl.textContent = msg;
        console.warn("⚠️ " + msg);
        valido = false;
    } else if (!validarEmailFront(correo)) {
        const msg = "Correo inválido";
        if (errorCorreoEl) errorCorreoEl.textContent = msg;
        console.warn("⚠️ " + msg);
        valido = false;
    }

    if (!password) {
        const msg = "La contraseña es requerida";
        if (errorPasswordEl) errorPasswordEl.textContent = msg;
        console.warn("⚠️ " + msg);
        valido = false;
    }

    if (!valido) {
        console.log("Validación local fallida");
        return;
    }

    console.log("✅ Validación local completada. Enviando al servidor...");

    // Enviar al servidor
    fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password })
    })
    .then(res => {
        console.log("Respuesta del servidor:", res.status);
        return res.json();
    })
    .then(data => {
        console.log("Datos recibidos:", data);
        
        if (data.ok) {
            console.log("Login exitoso");
            // ✅ Guardar en localStorage
            localStorage.setItem("id_usuario", data.id);
            localStorage.setItem("nombre", data.nombre);
            localStorage.setItem("tipo", data.tipo);
            
            console.log("Redirigiendo a /panel...");
            window.location.href = "/panel";
        } else {
            const error = data.error || "Error al iniciar sesión";
            console.error("Error del servidor:", error);
            if (authErrorEl) authErrorEl.textContent = error;
        }
    })
    .catch(err => {
        console.error("Error de conexión:", err);
        const msg = "Error de conexión con el servidor";
        if (authErrorEl) authErrorEl.textContent = msg;
    });
}

function irRegistro() {
    window.location.href = "/registro";
}