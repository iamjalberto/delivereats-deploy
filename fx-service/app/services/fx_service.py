"""
Servicio principal de conversión de divisas.
Flujo:  caché Redis  →  API externa (open.er-api.com)  →  respaldo 24 h.
"""
import time
import requests
from app import config as cfg
from app.utils.logger import get_logger
from app.services.cache_service import cache_mgr

log = get_logger('exchange')


class CurrencyConverter:
    """Resuelve tasas de cambio con estrategia cache-first."""

    def __init__(self, api_url: str = cfg.EXCHANGE_API_URL,
                 timeout: int = cfg.EXCHANGE_TIMEOUT):
        self._api = api_url
        self._timeout = timeout

    # ── helpers ─────────────────────────────────────────────
    def _fetch_rates(self, base: str) -> dict:
        """Llama a la API externa y devuelve el dict completo de tasas."""
        resp = requests.get(f'{self._api}/{base}', timeout=self._timeout)
        resp.raise_for_status()
        body = resp.json()
        if body.get('result') != 'success':
            raise ValueError(f"API error: {body.get('error-type', '?')}")
        return body.get('rates', {}), body.get('time_last_update_unix', int(time.time()))

    def _use_backup(self, base: str, target: str):
        """Último recurso: tasa de respaldo guardada en Redis."""
        backup = cache_mgr.lookup_backup(base, target)
        if backup:
            log.warning('Respaldo utilizado para %s->%s', base, target)
            return self._format_single(base, target, backup['rate'],
                                       backup['ts'], cached=True, backup=True), None
        return None, f'Sin tasa disponible para {base}->{target} (ni cache ni backup)'

    @staticmethod
    def _format_single(base, target, rate, ts, *, cached=False, backup=False):
        return {
            'from_currency': base,
            'to_currency':   target,
            'rate':          rate,
            'timestamp':     ts,
            'from_cache':    cached,
            'is_fallback':   backup,
        }

    # ── API pública ─────────────────────────────────────────
    def convert(self, base: str, target: str):
        """Obtiene la tasa base→target.  Retorna (resultado, error)."""
        # 1) cache
        hit = cache_mgr.lookup(base, target)
        if hit:
            return self._format_single(
                base, target, hit['rate'], hit['ts'], cached=True), None

        # 2) API externa
        try:
            log.info('Consultando API: %s -> %s', base, target)
            all_rates, ts = self._fetch_rates(base)

            if target not in all_rates:
                raise KeyError(f'Moneda {target} no disponible en respuesta')

            rate = all_rates[target]
            cache_mgr.store(base, target, rate, ts)
            return self._format_single(base, target, rate, ts), None

        except (requests.Timeout, requests.ConnectionError) as exc:
            log.error('Fallo de red: %s', exc)
            return self._use_backup(base, target)

        except Exception as exc:
            log.error('Error general: %s', exc)
            return self._use_backup(base, target)

    def convert_many(self, base: str, targets: list[str]):
        """Obtiene varias tasas desde una moneda base.  Retorna (resultado, error)."""
        try:
            log.info('Consultando API (batch): %s -> %s', base, targets)
            all_rates, ts = self._fetch_rates(base)

            found = {t: all_rates[t] for t in targets if t in all_rates}
            if not found:
                raise KeyError('Ninguna moneda solicitada está en la respuesta')

            cache_mgr.store_batch(base, found, ts)

            return {
                'base_currency': base,
                'rates':         found,
                'timestamp':     ts,
                'from_cache':    False,
            }, None

        except Exception as exc:
            log.error('Error en convert_many: %s', exc)
            return None, str(exc)


# Instancia global
converter = CurrencyConverter()
