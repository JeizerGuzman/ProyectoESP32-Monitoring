"""
Script de migración para actualizar el esquema de BD.
Ejecutar si la BD no tiene las columnas nuevas agregadas.

Uso:
    python migrate_db.py

Cambios aplicados:
    1. Vehiculos: agrega columna 'chofer_id' (nullable) si no existe
    2. Historial: agrega columna 'id_vehiculo' si no existe
    3. Vehiculos: agrega columna 'identificador' (unique) si no existe
"""

import pymysql
from config import Config

def ejecutar_migracion():
    """Conecta a la BD y ejecuta migraciones."""
    
    # Extraer credenciales de la URI
    # Formato: mysql+pymysql://user:password@host:port/database
    uri = Config.SQLALCHEMY_DATABASE_URI
    
    # Parsear URI: mysql+pymysql://root:davidlaid@localhost:3306/monitoreo
    parts = uri.replace('mysql+pymysql://', '').split('@')
    user_pass = parts[0].split(':')
    user = user_pass[0]
    password = user_pass[1]
    
    host_port = parts[1].split(':')
    host = host_port[0]
    db_port = int(host_port[1].split('/')[0])
    database = host_port[1].split('/')[1]
    
    print(f"[Migración] Conectando a {user}@{host}:{db_port}/{database}")
    
    try:
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=db_port
        )
        cursor = conn.cursor()
        
        # ========================================
        # MIGRACIÓN 1: Agregar identificador a vehiculos
        # ========================================
        print("\n[Migración 1] Verificando columna 'identificador' en 'vehiculos'...")
        cursor.execute("""
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME='vehiculos' AND COLUMN_NAME='identificador'
        """)
        if not cursor.fetchone():
            print("  ↳ Agregando columna 'identificador'...")
            cursor.execute("""
                ALTER TABLE vehiculos 
                ADD COLUMN identificador VARCHAR(50) UNIQUE AFTER nombre
            """)
            conn.commit()
            print("  ✓ Columna 'identificador' agregada")
        else:
            print("  ✓ Columna 'identificador' ya existe")
        
        # ========================================
        # MIGRACIÓN 2: Agregar id_vehiculo a historial
        # ========================================
        print("\n[Migración 2] Verificando columna 'id_vehiculo' en 'historial'...")
        cursor.execute("""
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME='historial' AND COLUMN_NAME='id_vehiculo'
        """)
        if not cursor.fetchone():
            print("  ↳ Agregando columna 'id_vehiculo'...")
            cursor.execute("""
                ALTER TABLE historial 
                ADD COLUMN id_vehiculo INT AFTER vehiculo
            """)
            conn.commit()
            print("  ✓ Columna 'id_vehiculo' agregada")
        else:
            print("  ✓ Columna 'id_vehiculo' ya existe")
        
        # ========================================
        # MIGRACIÓN 3: Agregar chofer_id a vehiculos
        # ========================================
        print("\n[Migración 3] Verificando columna 'chofer_id' en 'vehiculos'...")
        cursor.execute("""
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME='vehiculos' AND COLUMN_NAME='chofer_id'
        """)
        if not cursor.fetchone():
            print("  ↳ Agregando columna 'chofer_id'...")
            cursor.execute("""
                ALTER TABLE vehiculos 
                ADD COLUMN chofer_id INT AFTER usuario_id
            """)
            conn.commit()
            print("  ✓ Columna 'chofer_id' agregada")
        else:
            print("  ✓ Columna 'chofer_id' ya existe")
        
        print("\n[✓] Migración completada exitosamente")
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\n[✗] Error en migración: {e}")
        return False
    
    return True

if __name__ == '__main__':
    print("=" * 60)
    print(" TrackSecurity - Script de Migración de BD")
    print("=" * 60)
    
    exito = ejecutar_migracion()
    
    if exito:
        print("\n[Éxito] La BD está actualizada. Puedes ejecutar la app normalmente.")
    else:
        print("\n[Error] Revisa la conexión y credenciales en config.py")
        exit(1)
