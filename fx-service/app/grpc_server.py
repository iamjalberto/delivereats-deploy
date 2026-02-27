"""
Servidor gRPC para exponer el servicio de tasas de cambio.
Implementa los RPCs definidos en fx_service.proto.
"""
import grpc
import time
from concurrent import futures

from app.protos import fx_service_pb2, fx_service_pb2_grpc
from app.services.fx_service import converter
from app import config as cfg
from app.utils.logger import get_logger

log = get_logger('grpc')


class ExchangeServicer(fx_service_pb2_grpc.FXServiceServicer):
    """Implementación concreta de los RPCs de FXService."""

    # ── GetExchangeRate ─────────────────────────────────────
    def GetExchangeRate(self, request, context):
        base   = (request.from_currency or '').upper()
        target = (request.to_currency or '').upper()
        log.info('RPC GetExchangeRate  %s -> %s', base, target)

        if not base or not target:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          'Se requieren from_currency y to_currency')

        result, err = converter.convert(base, target)

        if err:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(err)
            return fx_service_pb2.ExchangeRateResponse()

        return fx_service_pb2.ExchangeRateResponse(
            from_currency = result['from_currency'],
            to_currency   = result['to_currency'],
            rate          = result['rate'],
            timestamp     = result['timestamp'],
            from_cache    = result['from_cache'],
            is_fallback   = result['is_fallback'],
        )

    # ── GetMultipleRates ────────────────────────────────────
    def GetMultipleRates(self, request, context):
        base    = (request.base_currency or '').upper()
        targets = [c.upper() for c in request.target_currencies]
        log.info('RPC GetMultipleRates %s -> %s', base, targets)

        if not base or not targets:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          'Se requieren base_currency y al menos una target')

        result, err = converter.convert_many(base, targets)

        if err:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(err)
            return fx_service_pb2.MultipleRatesResponse()

        return fx_service_pb2.MultipleRatesResponse(
            base_currency = result['base_currency'],
            rates         = result['rates'],
            timestamp     = result['timestamp'],
            from_cache    = result['from_cache'],
        )


# ── arranque del servidor ──────────────────────────────────
def start_grpc():
    """Crea, configura e inicia el servidor gRPC (bloqueante)."""
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=cfg.GRPC_WORKERS),
        options=[
            ('grpc.max_send_message_length',    50 * 1024 * 1024),
            ('grpc.max_receive_message_length',  50 * 1024 * 1024),
        ],
    )
    fx_service_pb2_grpc.add_FXServiceServicer_to_server(
        ExchangeServicer(), server)
    server.add_insecure_port(f'[::]:{cfg.GRPC_PORT}')
    server.start()
    log.info('gRPC escuchando en puerto %s', cfg.GRPC_PORT)

    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        log.info('Apagando servidor gRPC…')
        server.stop(grace=2)


if __name__ == '__main__':
    start_grpc()
