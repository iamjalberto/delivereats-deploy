"""
FX Service - Unit Tests
Tests para conversión de divisas, caché Redis y health-check Flask.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
import time


# ========== CurrencyConverter Tests ==========

class TestCurrencyConverter:
    """Tests para la lógica de conversión de divisas."""

    @patch('app.services.fx_service.cache_mgr')
    def test_convert_from_cache(self, mock_cache):
        """Debe retornar tasa desde caché si existe."""
        from app.services.fx_service import CurrencyConverter

        mock_cache.lookup.return_value = {
            'base': 'USD', 'target': 'GTQ',
            'rate': 7.85, 'ts': 1700000000,
            'cached': True, 'is_backup': False,
        }

        converter = CurrencyConverter()
        result, err = converter.convert('USD', 'GTQ')

        assert err is None
        assert result['from_currency'] == 'USD'
        assert result['to_currency'] == 'GTQ'
        assert result['rate'] == 7.85
        assert result['from_cache'] is True
        mock_cache.lookup.assert_called_once_with('USD', 'GTQ')

    @patch('app.services.fx_service.cache_mgr')
    @patch('app.services.fx_service.requests')
    def test_convert_from_api(self, mock_requests, mock_cache):
        """Debe consultar API externa si no hay caché."""
        from app.services.fx_service import CurrencyConverter

        mock_cache.lookup.return_value = None
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'result': 'success',
            'rates': {'GTQ': 7.85, 'EUR': 0.92, 'MXN': 17.5},
            'time_last_update_unix': 1700000000,
        }
        mock_response.raise_for_status = MagicMock()
        mock_requests.get.return_value = mock_response

        converter = CurrencyConverter()
        result, err = converter.convert('USD', 'GTQ')

        assert err is None
        assert result['from_currency'] == 'USD'
        assert result['to_currency'] == 'GTQ'
        assert result['rate'] == 7.85
        assert result['from_cache'] is False
        mock_cache.store.assert_called_once_with('USD', 'GTQ', 7.85, 1700000000)

    @patch('app.services.fx_service.cache_mgr')
    @patch('app.services.fx_service.requests')
    def test_convert_api_failure_uses_backup(self, mock_requests, mock_cache):
        """Debe usar respaldo si la API falla."""
        from app.services.fx_service import CurrencyConverter
        import requests as real_requests

        mock_cache.lookup.return_value = None
        mock_requests.get.side_effect = Exception("Network error")
        mock_requests.Timeout = real_requests.Timeout
        mock_requests.ConnectionError = real_requests.ConnectionError

        mock_cache.lookup_backup.return_value = {
            'base': 'USD', 'target': 'GTQ',
            'rate': 7.80, 'ts': 1699000000,
            'cached': True, 'is_backup': True,
        }

        converter = CurrencyConverter()
        result, err = converter.convert('USD', 'GTQ')

        assert err is None
        assert result['rate'] == 7.80
        assert result['is_fallback'] is True
        mock_cache.lookup_backup.assert_called_once_with('USD', 'GTQ')

    @patch('app.services.fx_service.cache_mgr')
    @patch('app.services.fx_service.requests')
    def test_convert_no_cache_no_backup_returns_error(self, mock_requests, mock_cache):
        """Debe retornar error si no hay caché, API falla y no hay backup."""
        from app.services.fx_service import CurrencyConverter
        import requests as real_requests

        mock_cache.lookup.return_value = None
        mock_requests.get.side_effect = Exception("Network error")
        mock_requests.Timeout = real_requests.Timeout
        mock_requests.ConnectionError = real_requests.ConnectionError
        mock_cache.lookup_backup.return_value = None

        converter = CurrencyConverter()
        result, err = converter.convert('USD', 'GTQ')

        assert result is None
        assert 'Sin tasa disponible' in err

    @patch('app.services.fx_service.cache_mgr')
    @patch('app.services.fx_service.requests')
    def test_convert_target_not_in_api_response(self, mock_requests, mock_cache):
        """Debe usar backup si la moneda no está en respuesta de API."""
        from app.services.fx_service import CurrencyConverter
        import requests as real_requests

        mock_cache.lookup.return_value = None
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'result': 'success',
            'rates': {'EUR': 0.92},  # GTQ no incluida
            'time_last_update_unix': 1700000000,
        }
        mock_response.raise_for_status = MagicMock()
        mock_requests.get.return_value = mock_response
        mock_requests.Timeout = real_requests.Timeout
        mock_requests.ConnectionError = real_requests.ConnectionError

        mock_cache.lookup_backup.return_value = None

        converter = CurrencyConverter()
        result, err = converter.convert('USD', 'GTQ')

        assert result is None
        assert err is not None

    @patch('app.services.fx_service.cache_mgr')
    @patch('app.services.fx_service.requests')
    def test_convert_many_success(self, mock_requests, mock_cache):
        """Debe obtener múltiples tasas exitosamente."""
        from app.services.fx_service import CurrencyConverter

        mock_response = MagicMock()
        mock_response.json.return_value = {
            'result': 'success',
            'rates': {'GTQ': 7.85, 'EUR': 0.92, 'MXN': 17.5},
            'time_last_update_unix': 1700000000,
        }
        mock_response.raise_for_status = MagicMock()
        mock_requests.get.return_value = mock_response

        converter = CurrencyConverter()
        result, err = converter.convert_many('USD', ['GTQ', 'EUR'])

        assert err is None
        assert result['base_currency'] == 'USD'
        assert result['rates']['GTQ'] == 7.85
        assert result['rates']['EUR'] == 0.92
        assert result['from_cache'] is False
        mock_cache.store_batch.assert_called_once()

    @patch('app.services.fx_service.cache_mgr')
    @patch('app.services.fx_service.requests')
    def test_convert_many_api_failure(self, mock_requests, mock_cache):
        """Debe retornar error si la API falla en batch."""
        from app.services.fx_service import CurrencyConverter

        mock_requests.get.side_effect = Exception("API down")

        converter = CurrencyConverter()
        result, err = converter.convert_many('USD', ['GTQ', 'EUR'])

        assert result is None
        assert err is not None


# ========== Format Helpers ==========

class TestFormatHelpers:
    """Tests para funciones auxiliares de formato."""

    def test_format_single(self):
        """Debe formatear resultado individual correctamente."""
        from app.services.fx_service import CurrencyConverter
        result = CurrencyConverter._format_single(
            'USD', 'GTQ', 7.85, 1700000000, cached=False, backup=False
        )
        assert result['from_currency'] == 'USD'
        assert result['to_currency'] == 'GTQ'
        assert result['rate'] == 7.85
        assert result['from_cache'] is False
        assert result['is_fallback'] is False

    def test_format_single_with_cache_and_backup(self):
        """Debe formatear resultado con flags de caché y backup."""
        from app.services.fx_service import CurrencyConverter
        result = CurrencyConverter._format_single(
            'EUR', 'GTQ', 8.50, 1700000000, cached=True, backup=True
        )
        assert result['from_cache'] is True
        assert result['is_fallback'] is True


# ========== Cache Service Tests ==========

class TestCacheService:
    """Tests para la lógica de caché Redis."""

    def test_pack_unpack_roundtrip(self):
        """Debe empaquetar y desempaquetar datos correctamente."""
        from app.services.cache_service import RedisCacheManager

        packed = RedisCacheManager._pack('USD', 'GTQ', 7.85, 1700000000)
        data = json.loads(packed)
        assert data['base'] == 'USD'
        assert data['target'] == 'GTQ'
        assert data['rate'] == 7.85
        assert data['ts'] == 1700000000

    def test_unpack_returns_none_for_empty(self):
        """Debe retornar None para datos vacíos."""
        from app.services.cache_service import RedisCacheManager

        assert RedisCacheManager._unpack(None) is None
        assert RedisCacheManager._unpack('') is None

    def test_unpack_sets_cached_flag(self):
        """Debe marcar correctamente el flag de caché."""
        from app.services.cache_service import RedisCacheManager

        raw = json.dumps({'base': 'USD', 'target': 'GTQ', 'rate': 7.85, 'ts': 123})
        result = RedisCacheManager._unpack(raw)
        assert result['cached'] is True
        assert result['is_backup'] is False

    def test_unpack_sets_backup_flag(self):
        """Debe marcar correctamente el flag de backup."""
        from app.services.cache_service import RedisCacheManager

        raw = json.dumps({'base': 'USD', 'target': 'GTQ', 'rate': 7.85, 'ts': 123})
        result = RedisCacheManager._unpack(raw, is_backup=True)
        assert result['is_backup'] is True

    def test_hash_key_format(self):
        """Debe generar claves de hash correctamente."""
        from app.services.cache_service import RedisCacheManager

        assert RedisCacheManager._hash_key('rates', 'USD') == 'rates:USD'
        assert RedisCacheManager._hash_key('backup', 'EUR') == 'backup:EUR'


# ========== Flask Health Check Tests ==========

class TestFlaskApp:
    """Tests para los endpoints REST de health-check."""

    def _get_app(self):
        """Crea la Flask app sin importar el servidor gRPC."""
        import sys
        # Mock gRPC server module to avoid protobuf stub import issues
        mock_grpc_server = MagicMock()
        sys.modules['app.grpc_server'] = mock_grpc_server
        # Force re-import of app.main with mocked grpc_server
        if 'app.main' in sys.modules:
            del sys.modules['app.main']
        from app.main import app
        return app

    def test_health_endpoint(self):
        """Debe responder con status ok."""
        app = self._get_app()
        client = app.test_client()
        response = client.get('/health')
        data = response.get_json()

        assert response.status_code == 200
        assert data['status'] == 'ok'
        assert data['service'] == 'fx-service'

    def test_info_endpoint(self):
        """Debe responder con info del servicio."""
        app = self._get_app()
        client = app.test_client()
        response = client.get('/')
        data = response.get_json()

        assert response.status_code == 200
        assert data['service'] == 'fx-service'
        assert 'grpc_port' in data


# ========== Config Tests ==========

class TestConfig:
    """Tests para la configuración del servicio."""

    def test_default_config_values(self):
        """Debe tener valores por defecto sensatos."""
        from app import config as cfg
        assert cfg.EXCHANGE_TIMEOUT == 10
        assert cfg.SHORT_TTL > 0
        assert cfg.LONG_TTL > cfg.SHORT_TTL
        assert cfg.GRPC_WORKERS > 0

    @patch.dict('os.environ', {'FX_API_TIMEOUT': '30'})
    def test_env_override(self):
        """Debe respetar variables de entorno."""
        from app.config import _env_int
        assert _env_int('FX_API_TIMEOUT', 10) == 30
