import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Config:
    _db_url = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://root:fKJEAFpNdvkaswbcIVfpcDSTHOwwQjQT@mysql.railway.internal:3306/TrackSecurity'
    )

    # Railway devuelve mysql:// pero SQLAlchemy necesita mysql+pymysql://
    SQLALCHEMY_DATABASE_URI = _db_url.replace('mysql://', 'mysql+pymysql://', 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'innovatecsecurity2026')
    MAX_RECORDS_LIMIT = 50