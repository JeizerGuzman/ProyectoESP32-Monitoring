from flask import Flask, request, jsonify, render_template, session, redirect
from flask_cors import CORS
import time
import bcrypt
import re

from config import db, Config
from models import Usuario, Vehiculo, Historial

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.from_object(Config)

db.init_app(app)
CORS(app)

with app.app_context():
    db.create_all()

# ================= FUNCIONES DE VALIDACIÓN =================
def validar_email(correo):
    """Valida formato de email"""
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(patron, correo) is not None

def validar_password(password):
    """
    Valida contraseña:
    - Mínimo 6 caracteres
    - Al menos 1 número
    - Al menos 1 letra
    """
    if len(password) < 6:
        return False, "La contraseña debe tener al menos 6 caracteres"
    if not re.search(r'\d', password):
        return False, "La contraseña debe contener al menos 1 número"
    if not re.search(r'[a-zA-Z]', password):
        return False, "La contraseña debe contener al menos 1 letra"
    return True, "Válida"

def validar_tipo(tipo):
    """Valida que el tipo sea válido"""
    return tipo in ["dueno", "chofer"]

# ================= API LISTAR CHOFERES =================
@app.route('/api/choferes', methods=['GET'])
def listar_choferes():
    # Solo dueños pueden ver la lista de choferes
    if 'id' not in session:
        return jsonify({"error": "no autenticado"}), 401
 
    if session.get('tipo') != 'dueno':
        return jsonify({"error": "acceso denegado"}), 403
 
    choferes = Usuario.query.filter_by(tipo='chofer').all()
 
    return jsonify({
        "choferes": [
            {"id": c.id, "nombre": c.nombre, "correo": c.correo}
            for c in choferes
        ]
    }), 200

# ================= RUTAS HTML =================
@app.route('/')
def index():                              # ← cambié nombre a index
    if 'usuario' in session:
        return redirect('/panel')
    return render_template('login.html')

@app.route('/registro')
def vista_registro():                     # ← nombre único sin conflicto
    return render_template('registro.html')

@app.route('/panel')
def vista_panel():
    if 'usuario' not in session:
        return redirect('/')
    return render_template('index.html', tipo=session['tipo'], nombre=session['usuario'], id_usuario=session['id'])

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

# ================= API REGISTRO =================
@app.route('/api/registro', methods=['POST'])
def api_registro():
    data = request.json

    # ✅ Validación 1: Datos no vacíos
    if not data or not all(k in data for k in ["nombre", "correo", "password", "tipo"]):
        return jsonify({"error": "campos incompletos"}), 400

    nombre = data.get("nombre", "").strip()
    correo = data.get("correo", "").strip()
    password = data.get("password", "")
    tipo = data.get("tipo", "").strip()

    # ✅ Validación 2: Campos no vacíos
    if not nombre or not correo or not password or not tipo:
        return jsonify({"error": "todos los campos son requeridos"}), 400

    # ✅ Validación 3: Email válido
    if not validar_email(correo):
        return jsonify({"error": "correo inválido"}), 400

    # ✅ Validación 4: Tipo válido
    if not validar_tipo(tipo):
        return jsonify({"error": "tipo de usuario inválido"}), 400

    # ✅ Validación 5: Contraseña fuerte
    valido, mensaje = validar_password(password)
    if not valido:
        return jsonify({"error": mensaje}), 400

    # ✅ Validación 6: Correo no duplicado
    existente = Usuario.query.filter_by(correo=correo).first()
    if existente:
        return jsonify({"error": "correo ya registrado"}), 400

    try:
        # Cifrar contraseña con bcrypt
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        usuario = Usuario(
            nombre=nombre,
            correo=correo,
            password=password_hash,
            tipo=tipo
        )
        db.session.add(usuario)
        db.session.commit()
        return jsonify({"ok": True, "mensaje": "cuenta creada exitosamente"}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error al registrar: {e}")
        return jsonify({"error": "error interno del servidor"}), 500

# ================= API LOGIN =================
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json

    # ✅ Validación 1: Datos no vacíos
    if not data or not all(k in data for k in ["correo", "password"]):
        return jsonify({"error": "correo y contraseña requeridos"}), 400

    correo = data.get("correo", "").strip()
    password = data.get("password", "")

    # ✅ Validación 2: Campos no vacíos
    if not correo or not password:
        return jsonify({"error": "correo y contraseña requeridos"}), 400

    # ✅ Validación 3: Usuario existe
    usuario = Usuario.query.filter_by(correo=correo).first()
    if not usuario:
        return jsonify({"error": "correo o contraseña incorrectos"}), 401

    # ✅ Validación 4: Contraseña correcta con bcrypt
    if not bcrypt.checkpw(password.encode(), usuario.password.encode()):
        return jsonify({"error": "correo o contraseña incorrectos"}), 401

    # Login exitoso
    session['usuario'] = usuario.nombre
    session['tipo'] = usuario.tipo
    session['id'] = usuario.id

    return jsonify({
        "ok": True,
        "id": usuario.id,
        "nombre": usuario.nombre,
        "tipo": usuario.tipo
    }), 200

# ================= API CREAR VEHÍCULO =================
@app.route('/api/vehiculos', methods=['POST'])
def crear_vehiculo():
    # ✅ Verificar autenticación
    if 'id' not in session:
        return jsonify({"error": "no autenticado"}), 401

    # ✅ Control de acceso: Solo dueños pueden crear vehículos
    if session.get('tipo') != 'dueno':
        return jsonify({"error": "solo los dueños pueden agregar vehículos"}), 403

    data = request.json

    # ✅ Validación: Datos completos
    if not data or "nombre" not in data or "identificador" not in data:
        return jsonify({"error": "nombre e identificador requeridos"}), 400

    nombre = data.get("nombre", "").strip()
    identificador = data.get("identificador", "").strip()

    # ✅ Validación: Campos no vacíos
    if not nombre or not identificador:
        return jsonify({"error": "nombre e identificador no pueden estar vacíos"}), 400

    usuario_id = session['id']

    # ✅ Validación: Identificador único
    existente = Vehiculo.query.filter_by(identificador=identificador).first()
    if existente:
        return jsonify({"error": "identificador ya existe"}), 400

    try:
        vehiculo = Vehiculo(
            nombre=nombre,
            identificador=identificador,
            usuario_id=usuario_id
        )
        db.session.add(vehiculo)
        db.session.commit()
        return jsonify({
            "ok": True,
            "vehiculo_id": vehiculo.id,
            "nombre": vehiculo.nombre,
            "identificador": vehiculo.identificador
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error al crear vehículo: {e}")
        return jsonify({"error": "error interno del servidor"}), 500

# ================= API ASIGNAR CHOFER A VEHÍCULO =================
@app.route('/api/vehiculos/<int:vehiculo_id>/asignar', methods=['POST'])
def asignar_chofer(vehiculo_id):
    # ✅ Verificar autenticación
    if 'id' not in session:
        return jsonify({"error": "no autenticado"}), 401

    # ✅ Control de acceso: Solo dueños pueden asignar choferes
    if session.get('tipo') != 'dueno':
        return jsonify({"error": "solo los dueños pueden asignar choferes"}), 403

    data = request.json

    # ✅ Validación: chofer_id proporcionado
    if not data or "chofer_id" not in data:
        return jsonify({"error": "chofer_id requerido"}), 400

    chofer_id = data.get("chofer_id")

    try:
        # Verificar que el vehículo existe y pertenece al dueño
        vehiculo = Vehiculo.query.filter_by(id=vehiculo_id, usuario_id=session['id']).first()
        if not vehiculo:
            return jsonify({"error": "vehículo no encontrado"}), 404

        # Si chofer_id es null, desasignar
        if chofer_id is None:
            vehiculo.chofer_id = None
            db.session.commit()
            return jsonify({"ok": True, "mensaje": "chofer desasignado"}), 200

        # Verificar que el usuario es un chofer
        chofer = Usuario.query.filter_by(id=chofer_id, tipo='chofer').first()
        if not chofer:
            return jsonify({"error": "chofer no existe"}), 404

        # Asignar chofer
        vehiculo.chofer_id = chofer_id
        db.session.commit()

        return jsonify({
            "ok": True,
            "mensaje": f"chofer {chofer.nombre} asignado al vehículo",
            "chofer_id": chofer_id,
            "chofer_nombre": chofer.nombre
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error al asignar chofer: {e}")
        return jsonify({"error": "error interno del servidor"}), 500

# ================= API ELIMINAR VEHÍCULO =================
@app.route('/api/vehiculos/<int:vehiculo_id>', methods=['DELETE'])
def eliminar_vehiculo(vehiculo_id):
    if 'id' not in session:
        return jsonify({"error": "no autenticado"}), 401

    if session.get('tipo') != 'dueno':
        return jsonify({"error": "solo los dueños pueden eliminar vehículos"}), 403

    try:
        # Verificar que el vehículo existe y pertenece al dueño
        vehiculo = Vehiculo.query.filter_by(id=vehiculo_id, usuario_id=session['id']).first()
        if not vehiculo:
            return jsonify({"error": "vehículo no encontrado"}), 404

        # Eliminar historial asociado primero (integridad referencial)
        Historial.query.filter_by(id_vehiculo=vehiculo_id).delete()

        db.session.delete(vehiculo)
        db.session.commit()
        return jsonify({"ok": True}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error al eliminar vehículo: {e}")
        return jsonify({"error": "error interno del servidor"}), 500
    

# ================= RECIBIR DATOS ESP32 =================
@app.route('/datos', methods=['POST'])
def recibir_datos():
    data = request.json

    if not data or "vehiculo" not in data:
        return jsonify({"error": "sin vehiculo"}), 400

    try:
        # ✅ NUEVO: Buscar vehículo por identificador para obtener su id
        identificador_esp32 = data["vehiculo"]  # Ej: "camion_1"
        vehiculo_obj = Vehiculo.query.filter_by(identificador=identificador_esp32).first()
        
        id_vehiculo = vehiculo_obj.id if vehiculo_obj else None

        # LIMPIEZA AUTOMÁTICA OPTIMIZADA: Mantener solo últimas 24 horas
        # Se ejecuta solo cuando hay más de 100 registros para mejor rendimiento
        if Historial.query.count() > 100:
            tiempo_limite = int(time.time()) - (24 * 60 * 60)  # 24 horas en segundos
            registros_eliminados = Historial.query.filter(Historial.timestamp < tiempo_limite).delete()
            if registros_eliminados > 0:
                db.session.commit()
                print(f"Limpieza automática: {registros_eliminados} registros antiguos eliminados")
            else:
                db.session.rollback()  # No hay cambios que confirmar

        # Guardar nuevo registro
        registro = Historial(
            vehiculo=data["vehiculo"],
            id_vehiculo=id_vehiculo,  # ✅ Guardar referencia al vehículo
            estado=data["estado"],
            alerta=data["alerta"],
            puerta=data["puerta"],
            vibracion=data["vibracion"],
            timestamp=int(time.time())
        )
        db.session.add(registro)
        db.session.commit()
        print("Guardado en BD:", data)
        return jsonify({"ok": True})

    except Exception as e:
        db.session.rollback()
        print(f"Error al guardar datos: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

def _nombre_chofer(vehiculo_obj):
    """Devuelve el nombre del chofer asignado al vehículo, o None."""
    if not vehiculo_obj.chofer_id:
        return None
    chofer = Usuario.query.get(vehiculo_obj.chofer_id)
    return chofer.nombre if chofer else None

# ================= OBTENER ESTADO =================
@app.route('/estado', methods=['GET'])
def obtener_estado():
    # ✅ PRIVACIDAD: Verificar que el usuario esté autenticado
    if 'id' not in session:
        return jsonify({"error": "no autenticado"}), 401

    usuario_id = session['id']
    tipo_usuario = session.get('tipo', 'usuario')

    # ✅ PRIVACIDAD + ROLES: Filtrar vehículos según tipo de usuario
    if tipo_usuario == 'dueno':
        # Dueño: ve todos sus vehículos
        vehiculos_usuario = Vehiculo.query.filter_by(usuario_id=usuario_id).all()
    elif tipo_usuario == 'chofer':
        # Chofer: ve solo su vehículo asignado
        vehiculos_usuario = Vehiculo.query.filter_by(chofer_id=usuario_id).all()
    else:
        return jsonify({"error": "tipo de usuario inválido"}), 400

    if not vehiculos_usuario:
        return jsonify({}), 200  # Usuario sin vehículos

    # Obtener IDs de vehículos para filtrar historial
    vehiculo_ids = [v.id for v in vehiculos_usuario]

    # Obtener últimos registros de historial para estos vehículos
    registros = Historial.query.filter(
        Historial.id_vehiculo.in_(vehiculo_ids)
    ).order_by(Historial.id.desc()).limit(app.config['MAX_RECORDS_LIMIT']).all()

    resultado = {}

    # Primero inicializar todos los vehículos con estado "sin señal"
    for v in vehiculos_usuario:
        resultado[v.nombre] = {
            "vehiculo":      v.nombre,
            "vehiculo_id":   v.id,
            "chofer_nombre": _nombre_chofer(v),
            "estado":        "sin señal",
            "alerta":        0,
            "puerta":        "desconocida",
            "vibracion":     0,
            "timestamp":     None
        }

    # Luego sobreescribir con datos reales si hay historial
    for r in registros:
        vehiculo_obj = next((v for v in vehiculos_usuario if v.id == r.id_vehiculo), None)
        if vehiculo_obj and vehiculo_obj.nombre not in resultado or True:
            nombre_vehiculo = vehiculo_obj.nombre if vehiculo_obj else None
            if nombre_vehiculo and nombre_vehiculo in resultado:
                # Solo el más reciente
                if resultado[nombre_vehiculo]["timestamp"] is None:
                    resultado[nombre_vehiculo].update({
                        "estado":    r.estado,
                        "alerta":    r.alerta,
                        "puerta":    r.puerta,
                        "vibracion": r.vibracion,
                        "timestamp": r.timestamp
                    })

    return jsonify(resultado), 200

# ================= MAIN =================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)