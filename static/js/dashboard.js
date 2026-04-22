// ================= INICIALIZACIÓN =================
document.addEventListener("DOMContentLoaded", () => {
    inicializarDashboard();
    actualizarEstado();
    setInterval(actualizarEstado, 1000);
    setInterval(tickClock, 1000);
});

// ================= INICIALIZAR DASHBOARD =================
function inicializarDashboard() {
    const id_usuario = window.SESSION_ID     || localStorage.getItem("id_usuario") || "0";
    const nombre     = window.SESSION_NOMBRE || localStorage.getItem("nombre")     || "Usuario";
    const tipo       = window.SESSION_TIPO   || localStorage.getItem("tipo")       || "usuario";

    localStorage.setItem("id_usuario", id_usuario);
    localStorage.setItem("nombre", nombre);
    localStorage.setItem("tipo", tipo);

    console.log(`[Dashboard] Usuario ${id_usuario} (${nombre}) conectado como ${tipo}`);

    document.getElementById("userName").textContent = nombre;

    const rolBadge = document.getElementById("rolBadge");
    if (tipo === "dueno") {
        rolBadge.textContent = "Dueño";
        rolBadge.className = "role-badge role-dueno";
        document.getElementById("btnAgregarVehiculo").style.display = "flex";
    } else if (tipo === "chofer") {
        rolBadge.textContent = "Chofer";
        rolBadge.className = "role-badge role-chofer";
        document.getElementById("btnAgregarVehiculo").style.display = "none";
    }

    const iniciales = nombre.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    document.getElementById("userAvatar").textContent = iniciales;
}

// ================= LOGOUT =================
function logout() {
    localStorage.clear();
    window.location.href = "/logout";
}

// ================= RELOJ =================
function tickClock() {
    const t = new Date().toLocaleTimeString("es-MX", { hour12: false });
    document.getElementById("pillSync").textContent = "SYNC " + t;
}

// ═══════════════════════════════════════════
// MODAL — AGREGAR VEHÍCULO
// ═══════════════════════════════════════════
function abrirModalVehiculo() {
    document.getElementById("modalVehiculo").classList.add("active");
}

function cerrarModalVehiculo() {
    document.getElementById("modalVehiculo").classList.remove("active");
    document.getElementById("nombreVehiculo").value = "";
    document.getElementById("identificadorVehiculo").value = "";
    document.getElementById("errorNombreVehiculo").style.display = "none";
    document.getElementById("errorIdentificadorVehiculo").style.display = "none";
}

function crearVehiculo() {
    const nombre       = document.getElementById("nombreVehiculo").value.trim();
    const identificador = document.getElementById("identificadorVehiculo").value.trim();

    let valido = true;

    if (!nombre) {
        document.getElementById("errorNombreVehiculo").textContent = "El nombre es requerido";
        document.getElementById("errorNombreVehiculo").style.display = "block";
        valido = false;
    } else {
        document.getElementById("errorNombreVehiculo").style.display = "none";
    }

    if (!identificador) {
        document.getElementById("errorIdentificadorVehiculo").textContent = "El identificador es requerido";
        document.getElementById("errorIdentificadorVehiculo").style.display = "block";
        valido = false;
    } else {
        document.getElementById("errorIdentificadorVehiculo").style.display = "none";
    }

    if (!valido) return;

    fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, identificador })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            cerrarModalVehiculo();
            actualizarEstado();
        } else {
            if (data.error && data.error.includes("identificador")) {
                document.getElementById("errorIdentificadorVehiculo").textContent = data.error;
                document.getElementById("errorIdentificadorVehiculo").style.display = "block";
            } else {
                alert(data.error || "Error al crear vehículo");
            }
        }
    })
    .catch(() => alert("Error de conexión"));
}

// ═══════════════════════════════════════════
// MODAL — ASIGNAR CHOFER
// ═══════════════════════════════════════════

// vehiculo_id activo para la asignación en curso
let _vehiculoIdActivo = null;

function abrirModalChofer(vehiculoId, nombreVehiculo) {
    _vehiculoIdActivo = vehiculoId;

    document.getElementById("nombreVehiculoAsignar").textContent = nombreVehiculo;
    document.getElementById("errorSelectChofer").style.display = "none";

    // Resetear select mientras carga
    const select = document.getElementById("selectChofer");
    select.innerHTML = '<option value="">Cargando choferes...</option>';
    select.disabled = true;

    document.getElementById("modalChofer").classList.add("active");

    // Cargar choferes desde el servidor
    fetch("/api/choferes")
        .then(res => res.json())
        .then(data => {
            select.innerHTML = "";

            if (!data.choferes || data.choferes.length === 0) {
                select.innerHTML = '<option value="">Sin choferes registrados</option>';
                select.disabled = true;
                return;
            }

            // Opción vacía inicial
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Seleccionar chofer...";
            select.appendChild(placeholder);

            data.choferes.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = `${c.nombre} — ${c.correo}`;
                select.appendChild(opt);
            });

            select.disabled = false;
        })
        .catch(() => {
            select.innerHTML = '<option value="">Error al cargar choferes</option>';
        });
}

function cerrarModalChofer() {
    document.getElementById("modalChofer").classList.remove("active");
    _vehiculoIdActivo = null;
}

function confirmarAsignacion() {
    const chofer_id = document.getElementById("selectChofer").value;

    if (!chofer_id) {
        document.getElementById("errorSelectChofer").textContent = "Selecciona un chofer";
        document.getElementById("errorSelectChofer").style.display = "block";
        return;
    }

    document.getElementById("errorSelectChofer").style.display = "none";

    fetch(`/api/vehiculos/${_vehiculoIdActivo}/asignar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chofer_id: parseInt(chofer_id) })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            cerrarModalChofer();
            actualizarEstado();
        } else {
            alert(data.error || "Error al asignar chofer");
        }
    })
    .catch(() => alert("Error de conexión"));
}

function desasignarChofer() {
    if (!_vehiculoIdActivo) return;

    fetch(`/api/vehiculos/${_vehiculoIdActivo}/asignar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chofer_id: null })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            cerrarModalChofer();
            actualizarEstado();
        } else {
            alert(data.error || "Error al desasignar");
        }
    })
    .catch(() => alert("Error de conexión"));
}

// ═══════════════════════════════════════════
// ESTADO Y RENDER
// ═══════════════════════════════════════════
function actualizarEstado() {
    fetch("/estado?t=" + new Date().getTime())
        .then(res => res.json())
        .then(data => renderDatos(data))
        .catch(err => {
            console.error("Error:", err);
            const pill = document.getElementById("statusBar").querySelector(".status-pill");
            if (pill) pill.textContent = "SIN CONEXIÓN";
        });
}

function renderDatos(data) {
    const contenedor = document.getElementById("contenedor");
    const tipo = localStorage.getItem("tipo") || "usuario";
    const keys = Object.keys(data).filter(k => data[k] && data[k].vehiculo);

    document.getElementById("pillCount").textContent = keys.length + " UNIDADES";
    document.getElementById("sectionSub").textContent =
        "última actualización " + new Date().toLocaleTimeString("es-MX", { hour12: false });

    if (keys.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                        <rect x="1" y="6" width="20" height="10" rx="2" stroke="#3D4048" stroke-width="1.5"/>
                        <circle cx="5" cy="18" r="2" stroke="#3D4048" stroke-width="1.5"/>
                        <circle cx="17" cy="18" r="2" stroke="#3D4048" stroke-width="1.5"/>
                    </svg>
                </div>
                <div class="empty-title">Sin vehículos activos</div>
                <div class="empty-sub">Esperando datos del ESP32...</div>
            </div>`;
        return;
    }

    // Primera carga o estado vacío → reconstruir todo
    if (contenedor.querySelector('.skeleton') || contenedor.querySelector('.empty-state')) {
        contenedor.innerHTML = "";
        keys.forEach((key, i) => {
            contenedor.innerHTML += crearTarjetaHTML(key, data[key], i, tipo);
        });
        return;
    }

    // Actualización incremental
    keys.forEach(key => actualizarTarjeta(key, data[key]));
}

// ─── CREAR HTML DE TARJETA ────────────────────
function crearTarjetaHTML(key, v, index, tipo) {
    const esAlerta = v.alerta === 1;
    const claseCard = esAlerta ? "vehicle-card alerta" : "vehicle-card normal";
    const ts = v.timestamp
        ? new Date(v.timestamp * 1000).toLocaleTimeString("es-MX", { hour12: false })
        : "--:--";

    const alertaBar = esAlerta ? `
        <div class="alert-bar">
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                <path d="M7 2L1 12h12L7 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                <path d="M7 6v3M7 10.5v.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Alerta activa — revisar unidad
        </div>` : "";

    // Chofer asignado (si el backend lo devuelve)
    const choferInfo = v.chofer_nombre
        ? `<div class="chofer-chip">
               <div class="chip-dot"></div>
               ${v.chofer_nombre}
           </div>`
        : `<div class="chofer-chip" style="color:var(--text-dim);">Sin chofer asignado</div>`;

    // Botón asignar solo para dueños
    const btnAsignar = tipo === "dueno" ? `
        <button class="btn-asignar" onclick="abrirModalChofer(${v.vehiculo_id || "'"+ key +"'"}, '${v.vehiculo}')">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="5" r="3" stroke="currentColor" stroke-width="1.3"/>
                <path d="M1 13c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Asignar chofer
        </button>` : "";

    return `
        <div class="${claseCard}" data-vehiculo="${key}" id="card-${key}" style="animation-delay:${index * 0.06}s">
            ${alertaBar}
            <div class="card-header">
                <div>
                    <div class="card-name">${v.vehiculo}</div>
                    <div class="card-plate">ESP32 · UART 115200</div>
                </div>
                <div class="status-badge ${esAlerta ? 'warn' : 'ok'}">
                    <div class="badge-dot"></div>
                    ${v.estado}
                </div>
            </div>

            <div class="card-metrics">
                <div class="metric">
                    <div class="metric-label">ESTADO</div>
                    <div class="metric-value estado-val ${esAlerta ? 'warn' : 'ok'}">${v.estado}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">PUERTA</div>
                    <div class="metric-value puerta-val ${v.puerta === 'abierta' ? 'warn' : 'ok'}">${v.puerta}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">VIBRACIÓN</div>
                    <div class="metric-value vibracion-val ${v.vibracion === 1 ? 'warn' : 'ok'}">${v.vibracion === 1 ? 'Detectada' : 'Normal'}</div>
                </div>
            </div>

            <div class="card-footer">
                <div style="display:flex; align-items:center; gap:12px;">
                    ${choferInfo}
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${btnAsignar}
                    <div class="card-footer-ts">Actualizado: <span class="timestamp">${ts}</span></div>
                </div>
            </div>
        </div>`;
}

// ─── ACTUALIZAR TARJETA EXISTENTE ─────────────
function actualizarTarjeta(key, v) {
    const card = document.getElementById(`card-${key}`);
    if (!card) return;

    const esAlerta = v.alerta === 1;
    const ts = v.timestamp
        ? new Date(v.timestamp * 1000).toLocaleTimeString("es-MX", { hour12: false })
        : "--:--";

    card.className = `vehicle-card ${esAlerta ? 'alerta' : 'normal'}`;

    // Barra de alerta
    let alertBar = card.querySelector('.alert-bar');
    if (esAlerta && !alertBar) {
        card.querySelector('.card-header').insertAdjacentHTML('beforebegin', `
            <div class="alert-bar">
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2L1 12h12L7 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                    <path d="M7 6v3M7 10.5v.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
                Alerta activa — revisar unidad
            </div>`);
    } else if (!esAlerta && alertBar) {
        alertBar.remove();
    }

    // Badge de estado
    const badge = card.querySelector('.status-badge');
    badge.className = `status-badge ${esAlerta ? 'warn' : 'ok'}`;
    badge.innerHTML = `<div class="badge-dot"></div>${v.estado}`;

    // Métricas
    const estadoEl    = card.querySelector('.estado-val');
    const puertaEl    = card.querySelector('.puerta-val');
    const vibracionEl = card.querySelector('.vibracion-val');

    estadoEl.className    = `metric-value estado-val ${esAlerta ? 'warn' : 'ok'}`;
    estadoEl.textContent  = v.estado;

    puertaEl.className    = `metric-value puerta-val ${v.puerta === 'abierta' ? 'warn' : 'ok'}`;
    puertaEl.textContent  = v.puerta;

    vibracionEl.className   = `metric-value vibracion-val ${v.vibracion === 1 ? 'warn' : 'ok'}`;
    vibracionEl.textContent = v.vibracion === 1 ? 'Detectada' : 'Normal';

    // Timestamp
    const tsEl = card.querySelector('.timestamp');
    if (tsEl) tsEl.textContent = ts;

    // Chofer chip
    const choferChip = card.querySelector('.chofer-chip');
    if (choferChip) {
        if (v.chofer_nombre) {
            choferChip.style.color = "";
            choferChip.innerHTML = `<div class="chip-dot"></div>${v.chofer_nombre}`;
        } else {
            choferChip.style.color = "var(--text-dim)";
            choferChip.innerHTML = "Sin chofer asignado";
        }
    }
}