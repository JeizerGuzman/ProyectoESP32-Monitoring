from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Config:
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:davidlaid@localhost:3306/monitoreo'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "innovatecsecurity2026"

    # ================= CONFIGURACIONES DE TIEMPO =================

    # WEB_UPDATE_INTERVAL: Intervalo de actualización de la página web (milisegundos)
    # Controla cada cuánto tiempo se refresca automáticamente el dashboard
    # Valor recomendado: 1000ms (1 segundo) - No muy rápido para evitar sobrecarga
    # Ejemplo: 500 = medio segundo, 2000 = 2 segundos
    WEB_UPDATE_INTERVAL = 1000  # 1 segundo

    # ESP32_SEND_INTERVAL: Intervalo máximo para envío de datos del ESP32 (milisegundos)
    # Tiempo mínimo que debe esperar el ESP32 entre envíos de datos al servidor
    # Evita sobrecargar el servidor con demasiadas peticiones
    # Valor recomendado: 1500ms (1.5 segundos) - Balance entre actualización y eficiencia
    # Ejemplo: 1000 = 1 segundo, 3000 = 3 segundos
    ESP32_SEND_INTERVAL = 1500  # 1.5 segundos

    # MAX_RECORDS_LIMIT: Límite máximo de registros a consultar en /estado
    # Número máximo de registros históricos que se consultan para mostrar el estado actual
    # Un valor alto puede hacer lentas las consultas, un valor bajo puede perder datos antiguos
    # Valor recomendado: 50 - Suficiente para mostrar estado actual sin sobrecargar
    # Ejemplo: 20 = pocos registros, 100 = muchos registros
    MAX_RECORDS_LIMIT = 50