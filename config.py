import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Config:
    # ✅ Variables de entorno para producción (Railway, etc)
    DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://root:davidlaid@localhost:3306/monitoreo')
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'innovatecsecurity2026')
    
    # Limpieza automática de historial
    WEB_UPDATE_INTERVAL = 2000  # 2 segundos (más conservador para Railway)
    ESP32_SEND_INTERVAL = 5000  # 5 segundos
    MAX_RECORDS_LIMIT = 50