from flask import Flask, request, jsonify, render_template, session, redirect
from flask_cors import CORS
import time

from config import db, Config
from models import Usuario, Vehiculo, Historial

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.from_object(Config)

db.init_app(app)
CORS(app)

with app.app_context():
    db.create_all()

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
def vista_panel():                        # ← nombre único sin conflicto
    if 'usuario' not in session:
        return redirect('/')
    return render_template('index.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

# ================= API REGISTRO =================
@app.route('/api/registro', methods=['POST'])
def api_registro():                       # ← nombre único
    data = request.json

    if not data:
        return jsonify({"error": "datos vacios"}), 400

    existente = Usuario.query.filter_by(correo=data["correo"]).first()
    if existente:
        return jsonify({"ok": False, "error": "correo ya registrado"}), 400

    usuario = Usuario(
        nombre=data["nombre"],
        correo=data["correo"],
        password=data["password"],
        tipo=data["tipo"]
    )
    db.session.add(usuario)
    db.session.commit()
    return jsonify({"ok": True})

# ================= API LOGIN =================
@app.route('/api/login', methods=['POST'])
def api_login():                          # ← nombre único
    data = request.json

    if not data:
        return jsonify({"ok": False}), 400

    usuario = Usuario.query.filter_by(
        correo=data["correo"],
        password=data["password"]
    ).first()

    if usuario:
        session['usuario'] = usuario.nombre
        session['tipo']    = usuario.tipo
        session['id']      = usuario.id
        return jsonify({
            "ok":     True,
            "tipo":   usuario.tipo,
            "nombre": usuario.nombre
        })
    return jsonify({"ok": False}), 401

# ================= RECIBIR DATOS ESP32 =================
@app.route('/datos', methods=['POST'])
def recibir_datos():
    data = request.json

    if not data or "vehiculo" not in data:
        return jsonify({"error": "sin vehiculo"}), 400

    try:
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

# ================= OBTENER ESTADO =================
@app.route('/estado', methods=['GET'])
def obtener_estado():
    # Eliminamos el commit innecesario que causaba delay
    registros = Historial.query.order_by(Historial.id.desc()).limit(app.config['MAX_RECORDS_LIMIT']).all()

    resultado = {}
    for r in registros:
        # Solo tomamos el registro más reciente por vehículo
        if r.vehiculo not in resultado:
            resultado[r.vehiculo] = {
                "vehiculo":  r.vehiculo,
                "estado":    r.estado,
                "alerta":    r.alerta,
                "puerta":    r.puerta,
                "vibracion": r.vibracion,
                "timestamp": r.timestamp
            }
    return jsonify(resultado)

# ================= MAIN =================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)