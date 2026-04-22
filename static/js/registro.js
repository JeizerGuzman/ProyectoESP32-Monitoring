// ================= VALIDACIONES =================
function validarEmailFront(email) {
    const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return patron.test(email);
}

function validarPassword(password) {
    if (password.length < 6) return false;
    if (!/\d/.test(password)) return false;  // Al menos 1 número
    if (!/[a-zA-Z]/.test(password)) return false;  // Al menos 1 letra
    return true;
}

function mostrarError(elementId, mensaje) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = mensaje;
        el.style.display = mensaje ? 'block' : 'none';
    }
}

function limpiarErrores() {
    document.getElementById("errorNombre").textContent = "";
    document.getElementById("errorCorreo").textContent = "";
    document.getElementById("errorPassword").textContent = "";
    document.getElementById("errorTipo").textContent = "";
    document.getElementById("authError").textContent = "";
}

// ================= INDICADOR DE FORTALEZA =================
function evalPassword(val) {
    const bars = [
        document.getElementById("bar1"),
        document.getElementById("bar2"),
        document.getElementById("bar3")
    ];
    bars.forEach(b => b.className = "strength-bar");

    if (val.length === 0) return;

    let score = 0;
    if (val.length >= 6) score++;
    if (/\d/.test(val) && /[a-zA-Z]/.test(val)) score++;
    if (val.length >= 10 && /[A-Z]/.test(val)) score++;

    const cls = ["active-weak", "active-medium", "active-strong"][score - 1] || "active-weak";
    for (let i = 0; i < score; i++) bars[i].classList.add(cls);
}

// ================= REGISTRO =================
function registrar() {
    limpiarErrores();
    
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;
    const tipo = document.getElementById("tipo").value.trim();

    // ✅ Validaciones locales
    let valido = true;

    if (!nombre) {
        mostrarError("errorNombre", "El nombre es requerido");
        valido = false;
    }

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
    } else if (password.length < 6) {
        mostrarError("errorPassword", "Mínimo 6 caracteres");
        valido = false;
    } else if (!/\d/.test(password)) {
        mostrarError("errorPassword", "Debe contener al menos 1 número");
        valido = false;
    } else if (!/[a-zA-Z]/.test(password)) {
        mostrarError("errorPassword", "Debe contener al menos 1 letra");
        valido = false;
    }

    if (!tipo) {
        mostrarError("errorTipo", "Selecciona un tipo de usuario");
        valido = false;
    }

    if (!valido) return;

    // Enviar al servidor
    fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, password, tipo })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            // ✅ Limpiar formulario
            document.getElementById("nombre").value = "";
            document.getElementById("correo").value = "";
            document.getElementById("password").value = "";
            document.getElementById("tipo").value = "";
            
            // Mostrar mensaje de éxito
            const authSuccess = document.getElementById("authSuccess");
            authSuccess.textContent = "Cuenta creada exitosamente. Redirigiendo...";
            authSuccess.style.display = "block";
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = "/";
            }, 2000);
        } else {
            mostrarError("authError", data.error || "Error al registrar");
        }
    })
    .catch(err => {
        mostrarError("authError", "Error de conexión con el servidor");
        console.error(err);
    });
}

function irLogin() {
    window.location.href = "/";
}