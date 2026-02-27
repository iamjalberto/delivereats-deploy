"""
Logger personalizado para el microservicio de tasas de cambio.
"""
import logging
import sys
from app import config as cfg

_FMT = '%(asctime)s | %(levelname)-7s | %(name)s.%(funcName)s | %(message)s'
_DATE = '%d/%m/%Y %H:%M:%S'

def get_logger(module: str = __name__) -> logging.Logger:
    log = logging.getLogger(f'fx.{module}')
    if not log.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(_FMT, datefmt=_DATE))
        log.addHandler(handler)
    log.setLevel(getattr(logging, cfg.LOG_LEVEL.upper(), logging.INFO))
    return log
