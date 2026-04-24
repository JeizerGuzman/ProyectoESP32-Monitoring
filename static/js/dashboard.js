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
    const nombre        = document.getElementById("nombreVehiculo").value.trim();
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
let _vehiculoIdActivo = null;

function abrirModalChofer(vehiculoId, nombreVehiculo) {
    _vehiculoIdActivo = vehiculoId;
    document.getElementById("nombreVehiculoAsignar").textContent = nombreVehiculo;
    document.getElementById("errorSelectChofer").style.display = "none";

    const select = document.getElementById("selectChofer");
    select.innerHTML = '<option value="">Cargando choferes...</option>';
    select.disabled = true;

    document.getElementById("modalChofer").classList.add("active");

    fetch("/api/choferes")
        .then(res => res.json())
        .then(data => {
            select.innerHTML = "";
            if (!data.choferes || data.choferes.length === 0) {
                select.innerHTML = '<option value="">Sin choferes registrados</option>';
                select.disabled = true;
                return;
            }
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
        if (data.ok) { cerrarModalChofer(); actualizarEstado(); }
        else alert(data.error || "Error al asignar chofer");
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
        if (data.ok) { cerrarModalChofer(); actualizarEstado(); }
        else alert(data.error || "Error al desasignar");
    })
    .catch(() => alert("Error de conexión"));
}

// ═══════════════════════════════════════════
// MODAL — ELIMINAR VEHÍCULO
// ═══════════════════════════════════════════
let _vehiculoIdEliminar = null;

function abrirModalEliminar(vehiculoId, nombreVehiculo) {
    _vehiculoIdEliminar = vehiculoId;
    document.getElementById("nombreVehiculoEliminar").textContent = nombreVehiculo;
    document.getElementById("modalEliminar").classList.add("active");
}

function cerrarModalEliminar() {
    document.getElementById("modalEliminar").classList.remove("active");
    _vehiculoIdEliminar = null;
}

function confirmarEliminacion() {
    if (!_vehiculoIdEliminar) return;
    fetch(`/api/vehiculos/${_vehiculoIdEliminar}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            cerrarModalEliminar();
            const card = document.getElementById(`card-${_vehiculoIdEliminar}`);
            if (card) card.remove();
            actualizarEstado();
        } else {
            alert(data.error || "Error al eliminar vehículo");
        }
    })
    .catch(() => alert("Error de conexión"));
}

// ═══════════════════════════════════════════
// MODAL — HISTORIAL
// ═══════════════════════════════════════════
let _historialChart = null;

function abrirModalHistorial(vehiculoId, nombreVehiculo) {
    document.getElementById("historialNombreVehiculo").textContent = nombreVehiculo;
    document.getElementById("historialCargando").style.display = "block";
    document.getElementById("historialTabla").style.display = "none";
    document.getElementById("historialVacio").style.display = "none";
    document.getElementById("historialBody").innerHTML = "";
    document.getElementById("modalHistorial").classList.add("active");

    // Destruir gráfica anterior si existe
    if (_historialChart) {
        _historialChart.destroy();
        _historialChart = null;
    }

    fetch(`/api/historial/${vehiculoId}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("historialCargando").style.display = "none";

            if (!data.rangos || data.rangos.length === 0) {
                document.getElementById("historialVacio").style.display = "block";
                return;
            }

            renderTablaHistorial(data.rangos);
            renderGraficaHistorial(data.rangos);
        })
        .catch(() => {
            document.getElementById("historialCargando").textContent = "Error al cargar historial";
        });
}

function cerrarModalHistorial() {
    document.getElementById("modalHistorial").classList.remove("active");
    if (_historialChart) {
        _historialChart.destroy();
        _historialChart = null;
    }
}

// ── Formatear segundos de duración en texto legible ──
function formatDuracion(segundos) {
    if (segundos < 60) return `${segundos}s`;
    if (segundos < 3600) return `${Math.floor(segundos / 60)}m ${segundos % 60}s`;
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return `${h}h ${m}m`;
}

function formatHora(ts) {
    return new Date(ts * 1000).toLocaleTimeString("es-MX", { hour12: false });
}

function formatFechaHora(ts) {
    return new Date(ts * 1000).toLocaleString("es-MX", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
    });
}

// ── Renderizar tabla de rangos ──
function renderTablaHistorial(rangos) {
    const tbody = document.getElementById("historialBody");
    tbody.innerHTML = "";

    rangos.forEach(r => {
        const duracion = r.fin - r.inicio;
        const esAlerta = r.alerta === 1;
        const esPuertaAbierta = r.puerta === "abierta";
        const esVibracion = r.vibracion === 1;

        const tr = document.createElement("tr");
        if (esAlerta) tr.classList.add("fila-alerta");

        tr.innerHTML = `
            <td class="td-mono">${formatFechaHora(r.inicio)}</td>
            <td class="td-mono">${formatFechaHora(r.fin)}</td>
            <td class="td-mono td-duracion">${formatDuracion(duracion)}</td>
            <td><span class="tag-estado ${esAlerta ? 'tag-warn' : 'tag-ok'}">${r.estado}</span></td>
            <td><span class="tag-estado ${esPuertaAbierta ? 'tag-warn' : 'tag-ok'}">${r.puerta}</span></td>
            <td><span class="tag-estado ${esVibracion ? 'tag-warn' : 'tag-ok'}">${esVibracion ? 'Detectada' : 'Normal'}</span></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("historialTabla").style.display = "table";
}

// ── Renderizar gráfica de línea de tiempo ──
function renderGraficaHistorial(rangos) {
    const canvas = document.getElementById("historialChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function obtenerColor(r) {
        if (r.estado === "sin señal")                                          return "#FFB020";
        if (r.alerta === 1 || r.puerta === "abierta" || r.vibracion === 1)     return "#FF4D6A";
        return "#00E096";
    }

    // ── FUSIONAR rangos contiguos del mismo color ──────────────────
    // rangos viene más-reciente-primero; lo invertimos para procesar cronológico
    const cronologico = [...rangos].reverse();

    const fusionados = [];
    let actual = { ...cronologico[0], color: obtenerColor(cronologico[0]) };

    for (let i = 1; i < cronologico.length; i++) {
        const r     = cronologico[i];
        const color = obtenerColor(r);

        if (color === actual.color) {
            // Mismo color → extender el rango actual
            actual.fin = r.fin;
        } else {
            fusionados.push(actual);
            actual = { ...r, color };
        }
    }
    fusionados.push(actual);

    // ── Escala lineal relativa (sin adapter de fechas) ─────────────
    const tsBase = fusionados[0].inicio;
    const tsMax  = fusionados[fusionados.length - 1].fin;

    const barData = fusionados.map(r => ({
        x:    [r.inicio - tsBase, r.fin - tsBase],
        y:    "Timeline",
        color: r.color,
        meta:  r
    }));

    console.log("[Historial] rangos originales:", rangos.length,
                "→ fusionados:", fusionados.length,
                "| estados únicos:", [...new Set(fusionados.map(r => r.estado))]);

    _historialChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Timeline"],
            datasets: [{
                label:              "Historial",
                data:               barData,
                backgroundColor:    barData.map(d => d.color),
                borderWidth:        0,
                borderRadius:       3,
                barPercentage:      0.5,
                categoryPercentage: 1.0,
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            parsing: {
                xAxisKey: "x",
                yAxisKey: "y"
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => {
                            const r = items[0].raw.meta;
                            return `${formatFechaHora(r.inicio)} → ${formatFechaHora(r.fin)}`;
                        },
                        label: item => {
                            const r = item.raw.meta;
                            return [
                                `Duración : ${formatDuracion(r.fin - r.inicio)}`,
                                `Estado   : ${r.estado}`,
                                `Puerta   : ${r.puerta}`,
                                `Vibración: ${r.vibracion === 1 ? "Detectada" : "Normal"}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "linear",
                    min:  0,
                    max:  tsMax - tsBase,
                    ticks: {
                        color: "#6B7280",
                        font:  { size: 10 },
                        callback: val =>
                            new Date((tsBase + val) * 1000)
                                .toLocaleTimeString("es-MX", { hour12: false })
                    },
                    grid: { color: "rgba(255,255,255,0.05)" }
                },
                y: { display: false }
            }
        }
    });
}

// ── Config para Chart.js v2 ──────────────────────────────
function _configV2(barData, tsBase, tsMax) {
    return {
        type: "horizontalBar",
        data: {
            labels: ["Timeline"],
            datasets: barData.map(d => ({
                label:           "",
                data:            [d.x[1]],           // v2: ancho = valor único
                backgroundColor: d.color,
                borderWidth:     0,
                // v2 no soporta floating bars nativas — usamos base
                base:            d.x[0],
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend:    { display: false },
            animation: { duration: 0 },
            tooltips: {
                callbacks: {
                    title: (items, data) => {
                        const idx = items[0].datasetIndex;
                        const r   = barData[idx].meta;
                        return `${formatFechaHora(r.inicio)} → ${formatFechaHora(r.fin)}`;
                    },
                    label: (item, data) => {
                        const r = barData[item.datasetIndex].meta;
                        return [
                            `Duración : ${formatDuracion(r.fin - r.inicio)}`,
                            `Estado   : ${r.estado}`,
                            `Puerta   : ${r.puerta}`,
                            `Vibración: ${r.vibracion === 1 ? "Detectada" : "Normal"}`
                        ];
                    }
                }
            },
            scales: {
                xAxes: [{
                    type: "linear",
                    ticks: {
                        min: 0,
                        max: tsMax - tsBase,
                        fontColor: "#6B7280",
                        fontSize:  10,
                        callback: val => {
                            return new Date((tsBase + val) * 1000)
                                .toLocaleTimeString("es-MX", { hour12: false });
                        }
                    },
                    gridLines: { color: "rgba(255,255,255,0.05)" }
                }],
                yAxes: [{ display: false }]
            }
        }
    };
}

// ── Config para Chart.js v3 / v4 ────────────────────────
function _configV3(barData, tsBase, tsMax) {
    return {
        type: "bar",
        data: {
            labels: ["Timeline"],
            datasets: [{
                label:           "Historial",
                data:            barData,
                backgroundColor: barData.map(d => d.color),
                borderWidth:     0,
                borderRadius:    3,
                barPercentage:   0.5,
                categoryPercentage: 1.0,
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            parsing: {
                xAxisKey: "x",
                yAxisKey: "y"
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => {
                            const r = items[0].raw.meta;
                            return `${formatFechaHora(r.inicio)} → ${formatFechaHora(r.fin)}`;
                        },
                        label: item => {
                            const r = item.raw.meta;
                            return [
                                `Duración : ${formatDuracion(r.fin - r.inicio)}`,
                                `Estado   : ${r.estado}`,
                                `Puerta   : ${r.puerta}`,
                                `Vibración: ${r.vibracion === 1 ? "Detectada" : "Normal"}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "linear",
                    min:  0,
                    max:  tsMax - tsBase,
                    ticks: {
                        color: "#6B7280",
                        font:  { size: 10 },
                        callback: val =>
                            new Date((tsBase + val) * 1000)
                                .toLocaleTimeString("es-MX", { hour12: false })
                    },
                    grid: { color: "rgba(255,255,255,0.05)" }
                },
                y: { display: false }
            }
        }
    };
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

    const tarjetasActuales = Array.from(contenedor.querySelectorAll('.vehicle-card'))
        .map(c => c.id.replace('card-', ''));
    const keysNuevos = keys.map(k => data[k].vehiculo_id?.toString() || k);

    const mismoConjunto =
        tarjetasActuales.length === keysNuevos.length &&
        keysNuevos.every(k => tarjetasActuales.includes(k));

    if (!mismoConjunto || contenedor.querySelector('.skeleton') || contenedor.querySelector('.empty-state')) {
        contenedor.innerHTML = "";
        keys.forEach((key, i) => {
            contenedor.innerHTML += crearTarjetaHTML(key, data[key], i, tipo);
        });
        return;
    }

    keys.forEach(key => actualizarTarjeta(key, data[key]));
}

// ─── CREAR HTML DE TARJETA ────────────────────
function crearTarjetaHTML(key, v, index, tipo) {
    const esAlerta = v.alerta === 1;
    const esSinSenal = v.estado === 'sin señal';
    let claseCard = "vehicle-card normal";
    if (esAlerta) claseCard = "vehicle-card alerta";
    else if (esSinSenal) claseCard = "vehicle-card sin-senal";
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

    const choferInfo = v.chofer_nombre
        ? `<div class="chofer-chip"><div class="chip-dot"></div>${v.chofer_nombre}</div>`
        : `<div class="chofer-chip" style="color:var(--text-dim);">Sin chofer asignado</div>`;

    const btnAcciones = tipo === "dueno" ? `
        <button class="btn-historial" onclick="abrirModalHistorial(${v.vehiculo_id}, '${v.vehiculo}')">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M7 4v3.5l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Historial
        </button>
        <button class="btn-asignar" onclick="abrirModalChofer(${v.vehiculo_id}, '${v.vehiculo}')">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="5" r="3" stroke="currentColor" stroke-width="1.3"/>
                <path d="M1 13c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Chofer
        </button>
        <button class="btn-eliminar" onclick="abrirModalEliminar(${v.vehiculo_id}, '${v.vehiculo}')">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>` : `
        <button class="btn-historial" onclick="abrirModalHistorial(${v.vehiculo_id}, '${v.vehiculo}')">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M7 4v3.5l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Historial
        </button>`;

    return `
        <div class="${claseCard}" data-vehiculo="${key}" id="card-${v.vehiculo_id}" style="animation-delay:${index * 0.06}s">
            ${alertaBar}
            <div class="card-header">
                <div>
                    <div class="card-name">${v.vehiculo}</div>
                    <div class="card-plate">ESP32 · UART 115200</div>
                </div>
                <div class="status-badge ${esAlerta ? 'warn' : esSinSenal ? 'mid' : 'ok'}">
                    <div class="badge-dot"></div>
                    ${v.estado}
                </div>
            </div>
            <div class="card-metrics">
                <div class="metric">
                    <div class="metric-label">ESTADO</div>
                    <div class="metric-value estado-val ${esAlerta ? 'warn' : v.estado === 'sin señal' ? 'mid' : 'ok'}">${v.estado}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">PUERTA</div>
                    <div class="metric-value puerta-val ${v.puerta === 'abierta' ? 'warn' : v.puerta === 'desconocida' ? 'mid' : 'ok'}">${v.puerta}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">VIBRACIÓN</div>
                    <div class="metric-value vibracion-val ${v.vibracion === 1 ? 'warn' : v.estado === 'sin señal' ? 'mid' : 'ok'}">${v.vibracion === 1 ? 'Detectada' : v.estado === 'sin señal' ? 'desconocida' : 'Normal'}</div>
                </div>
            </div>
            <div class="card-footer">
                <div style="display:flex;align-items:center;gap:12px;">${choferInfo}</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${btnAcciones}
                    <div class="card-footer-ts">Actualizado: <span class="timestamp">${ts}</span></div>
                </div>
            </div>
        </div>`;
}

// ─── ACTUALIZAR TARJETA EXISTENTE ─────────────
function actualizarTarjeta(key, v) {
    const card = document.getElementById(`card-${v.vehiculo_id}`);
    if (!card) return;

    const esAlerta = v.alerta === 1;
    const ts = v.timestamp
        ? new Date(v.timestamp * 1000).toLocaleTimeString("es-MX", { hour12: false })
        : "--:--";

    const esSinSenal = v.estado === 'sin señal';

    card.className = `vehicle-card ${
        esAlerta ? 'alerta' : esSinSenal ? 'sin-senal' : 'normal'
    }`;

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

    const badge = card.querySelector('.status-badge');
    badge.className = `status-badge ${
        esAlerta ? 'warn' : v.estado === 'sin señal' ? 'mid' : 'ok'
    }`;

    badge.innerHTML = `<div class="badge-dot"></div>${v.estado}`;

    const estadoEl    = card.querySelector('.estado-val');
    const puertaEl    = card.querySelector('.puerta-val');
    const vibracionEl = card.querySelector('.vibracion-val');

    estadoEl.className   = `metric-value estado-val ${esAlerta ? 'warn' : v.estado === 'sin señal' ? 'mid' : 'ok'}`;
    estadoEl.textContent = v.estado;

    puertaEl.className   = `metric-value puerta-val ${v.puerta === 'abierta' ? 'warn' : v.puerta === 'desconocida' ? 'mid' : 'ok'}`;
    puertaEl.textContent = v.puerta;

    vibracionEl.className   = `metric-value vibracion-val ${v.vibracion === 1 ? 'warn' : v.estado === 'sin señal' ? 'mid' : 'ok'}`;
    vibracionEl.textContent = v.vibracion === 1 ? 'Detectada' : v.estado === 'sin señal' ? 'desconocida' : 'Normal';

    const tsEl = card.querySelector('.timestamp');
    if (tsEl) tsEl.textContent = ts;

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