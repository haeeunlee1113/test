"""Entrypoint for running the Flask development server."""

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Flask 3.x no longer accepts custom request_timeout in app.run
    # Keep debug enabled for development; adjust host/port as needed.
    app.run(host="0.0.0.0", port=5000, debug=True)
