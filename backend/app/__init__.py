"""Application factory for the Flask backend."""

from flask import Flask
from flask_cors import CORS

from .config import Config
from .database import Base, init_engine
from .routes import api_bp


def create_app() -> Flask:
    """Create and configure the Flask application instance."""

    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for development convenience; tighten in production.
    CORS(app)

    # Initialize database engine and create tables if they do not exist.
    engine = init_engine(app.config["DATABASE_URL"])
    Base.metadata.create_all(bind=engine)

    # Register API blueprint.
    app.register_blueprint(api_bp, url_prefix="/api")

    return app
