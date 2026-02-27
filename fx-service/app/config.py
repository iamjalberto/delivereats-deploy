"""
Configuración centralizada del microservicio FX.
Carga variables de entorno con valores por defecto seguros.
"""
import os

def _env(key: str, default: str = '') -> str:
    return os.environ.get(key, default)

def _env_int(key: str, default: int = 0) -> int:
    return int(os.environ.get(key, str(default)))

def _env_bool(key: str, default: bool = False) -> bool:
    return os.environ.get(key, str(default)).lower() in ('true', '1', 'yes')


# ── Exchange Rate API ──────────────────────────────────────
EXCHANGE_API_URL  = _env('FX_API_BASE_URL', 'https://open.er-api.com/v6/latest')
EXCHANGE_TIMEOUT  = _env_int('FX_API_TIMEOUT', 10)

# ── Redis ──────────────────────────────────────────────────
REDIS_CFG = {
    'host':     _env('REDIS_HOST', 'localhost'),
    'port':     _env_int('REDIS_PORT', 6379),
    'db':       _env_int('REDIS_DB', 0),
    'password': _env('REDIS_PASSWORD', '') or None,
}
SHORT_TTL  = _env_int('CACHE_TTL', 360)      # caché normal  – 6 min
LONG_TTL   = _env_int('FALLBACK_TTL', 86400) # respaldo      – 24 h

# ── gRPC ───────────────────────────────────────────────────
GRPC_PORT        = _env('GRPC_PORT', '50056')
GRPC_WORKERS     = _env_int('GRPC_MAX_WORKERS', 10)

# ── Flask (health-check) ──────────────────────────────────
FLASK_HOST  = _env('FLASK_HOST', '0.0.0.0')
FLASK_PORT  = _env_int('FLASK_PORT', 5000)
FLASK_DEBUG = _env_bool('FLASK_DEBUG')

# ── Logging ────────────────────────────────────────────────
LOG_LEVEL = _env('LOG_LEVEL', 'INFO')
