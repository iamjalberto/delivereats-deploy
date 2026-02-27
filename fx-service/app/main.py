"""
Punto de entrada del micro-servicio FX.
Levanta Flask (health-check REST) + gRPC (conversión de divisas) en paralelo.
"""
from flask import Flask, jsonify
from flask_cors import CORS
from app import config as cfg
from app.utils.logger import get_logger
from app.grpc_server import start_grpc
import threading

log = get_logger('main')

app = Flask(__name__)
CORS(app)


@app.route('/health')
def health():
    return jsonify(status='ok', service='fx-service', version='1.0.0')


@app.route('/')
def info():
    return jsonify(
        service='fx-service',
        description='Micro-servicio de conversion de divisas con cache Redis',
        grpc_port=cfg.GRPC_PORT,
    )


if __name__ == '__main__':
    # gRPC en hilo aparte
    t = threading.Thread(target=start_grpc, daemon=True)
    t.start()
    log.info('Iniciando Flask en %s:%s', cfg.FLASK_HOST, cfg.FLASK_PORT)
    app.run(host=cfg.FLASK_HOST, port=cfg.FLASK_PORT, debug=cfg.FLASK_DEBUG)
