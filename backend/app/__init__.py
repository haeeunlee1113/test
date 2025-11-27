from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from .config import Config
from .database import init_db
from .routes import api_bp


def create_app() -> Flask:
    """Create and configure Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend
    CORS(app)

    # Initialize database
    init_db()

    # Register API blueprint
    app.register_blueprint(api_bp, url_prefix="/api")

    # Set request timeout for large file uploads
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH

    # Global error handler for file size exceeded
    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(error):
        max_size_mb = Config.MAX_CONTENT_LENGTH / (1024 * 1024)
        return (
            jsonify(
                {
                    "error": f"파일 크기가 너무 큽니다. 최대 {max_size_mb:.0f}MB까지 업로드 가능합니다."
                }
            ),
            413,
        )

    return app
