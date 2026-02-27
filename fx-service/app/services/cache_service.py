"""
Capa de caché sobre Redis para almacenar tasas de cambio.
Usa Redis Hashes agrupados por moneda base para mayor eficiencia
y mantiene un respaldo con TTL largo por si cae la API externa.
"""
import json
import redis
from app import config as cfg
from app.utils.logger import get_logger

log = get_logger('cache')

_PREFIX  = 'rates'
_BACKUP  = 'backup'


class RedisCacheManager:
    """Gestiona la caché de tasas en Redis usando hashes por moneda base."""

    def __init__(self):
        self._cli = self._connect()

    def _connect(self):
        try:
            client = redis.Redis(
                **cfg.REDIS_CFG,
                decode_responses=True,
                socket_connect_timeout=3,
                retry_on_timeout=True,
            )
            client.ping()
            log.info('Conexion a Redis establecida (%s:%s)',
                     cfg.REDIS_CFG['host'], cfg.REDIS_CFG['port'])
            return client
        except redis.RedisError as exc:
            log.error('No se pudo conectar a Redis: %s', exc)
            return None

    @property
    def available(self) -> bool:
        return self._cli is not None

    @staticmethod
    def _hash_key(prefix: str, base: str) -> str:
        return f'{prefix}:{base}'

    @staticmethod
    def _pack(base: str, target: str, rate: float, ts: int) -> str:
        return json.dumps({
            'base': base, 'target': target,
            'rate': rate, 'ts': ts,
        })

    @staticmethod
    def _unpack(raw: str, *, is_backup: bool = False) -> dict | None:
        if not raw:
            return None
        data = json.loads(raw)
        data['cached'] = True
        data['is_backup'] = is_backup
        return data

    def lookup(self, base: str, target: str) -> dict | None:
        """Busca una tasa en la caché principal."""
        if not self.available:
            return None
        try:
            raw = self._cli.hget(self._hash_key(_PREFIX, base), target)
            if raw:
                log.info('HIT  %s->%s', base, target)
                return self._unpack(raw)
            log.info('MISS %s->%s', base, target)
            return None
        except redis.RedisError as exc:
            log.error('Error leyendo cache: %s', exc)
            return None

    def lookup_backup(self, base: str, target: str) -> dict | None:
        """Busca en el respaldo de 24 h."""
        if not self.available:
            return None
        try:
            raw = self._cli.hget(self._hash_key(_BACKUP, base), target)
            if raw:
                log.warning('Usando respaldo para %s->%s', base, target)
                return self._unpack(raw, is_backup=True)
            return None
        except redis.RedisError as exc:
            log.error('Error leyendo backup: %s', exc)
            return None

    def store(self, base: str, target: str, rate: float, ts: int) -> bool:
        """Guarda una tasa individual en caché principal + respaldo."""
        if not self.available:
            return False
        try:
            payload = self._pack(base, target, rate, ts)
            pipe = self._cli.pipeline()
            pipe.hset(self._hash_key(_PREFIX, base), target, payload)
            pipe.expire(self._hash_key(_PREFIX, base), cfg.SHORT_TTL)
            pipe.hset(self._hash_key(_BACKUP, base), target, payload)
            pipe.expire(self._hash_key(_BACKUP, base), cfg.LONG_TTL)
            pipe.execute()
            log.info('Almacenado %s->%s (rate=%.6f)', base, target, rate)
            return True
        except redis.RedisError as exc:
            log.error('Error almacenando en cache: %s', exc)
            return False

    def store_batch(self, base: str, rates_map: dict[str, float], ts: int) -> bool:
        """Guarda varias tasas de golpe con pipeline."""
        if not self.available:
            return False
        try:
            pipe = self._cli.pipeline()
            main_key   = self._hash_key(_PREFIX, base)
            backup_key = self._hash_key(_BACKUP, base)
            for target, rate in rates_map.items():
                payload = self._pack(base, target, rate, ts)
                pipe.hset(main_key, target, payload)
                pipe.hset(backup_key, target, payload)
            pipe.expire(main_key, cfg.SHORT_TTL)
            pipe.expire(backup_key, cfg.LONG_TTL)
            pipe.execute()
            log.info('Batch de %d tasas almacenado para %s', len(rates_map), base)
            return True
        except redis.RedisError as exc:
            log.error('Error en batch store: %s', exc)
            return False


# Instancia global
cache_mgr = RedisCacheManager()
