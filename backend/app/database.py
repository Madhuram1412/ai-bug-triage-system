import logging
import pymysql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

db_info = {
    "engine_type": "mysql",
    "is_mysql": False,
    "database_name": settings.MYSQL_DATABASE,
    "host": settings.MYSQL_HOST,
    "port": settings.MYSQL_PORT,
    "status": "initializing",
    "error_message": None
}

def init_mysql_database():
    """Ensure MySQL database exists before SQLAlchemy connects."""
    try:
        conn = pymysql.connect(
            host=settings.MYSQL_HOST,
            port=settings.MYSQL_PORT,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            charset='utf8mb4'
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{settings.MYSQL_DATABASE}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.commit()
        conn.close()
        return True, None
    except Exception as e:
        return False, str(e)

def setup_engine():
    # If DATABASE_URL is explicitly mysql or settings specify mysql
    if "mysql" in settings.DATABASE_URL.lower():
        created, err = init_mysql_database()
        if created:
            try:
                eng = create_engine(
                    settings.DATABASE_URL,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )
                with eng.connect() as test_conn:
                    test_conn.execute(text("SELECT 1"))
                db_info["engine_type"] = "MySQL"
                db_info["is_mysql"] = True
                db_info["status"] = "connected"
                logger.info(f"✅ Connected to MySQL database '{settings.MYSQL_DATABASE}' on {settings.MYSQL_HOST}:{settings.MYSQL_PORT}")
                return eng
            except Exception as e:
                err = str(e)

        logger.warning(
            f"⚠️ Could not connect to MySQL server ({err or 'Offline'}). "
            f"Falling back to local SQLite storage for seamless operation. "
            f"Start your MySQL service (e.g. XAMPP/WAMP) to enable MySQL mode."
        )
        db_info["engine_type"] = "SQLite (MySQL Fallback)"
        db_info["is_mysql"] = False
        db_info["status"] = "fallback"
        db_info["error_message"] = err

    # SQLite connection
    eng = create_engine(
        "sqlite:///./bug_triage.db",
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
    if db_info["status"] == "initializing":
        db_info["engine_type"] = "SQLite"
        db_info["status"] = "connected"
    return eng

engine = setup_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_status():
    return db_info
