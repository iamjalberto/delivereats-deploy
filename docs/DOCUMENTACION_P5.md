# Documentación Práctica 5 - Módulo de Pagos y Tipo de Cambio

## Descripción General

La Práctica 5 integra al proyecto Delivereats dos nuevos microservicios:

1. **FX-Service (Tipo de Cambio)**: Microservicio en Python que consulta tipos de cambio en tiempo real y los cachea en Redis.
2. **Payment-Service (Pagos)**: Microservicio en Node.js que simula el procesamiento de pagos con tarjetas de crédito/débito y cartera digital.

Adicionalmente se implementó:
- **Subida de evidencia fotográfica** de entrega por parte del repartidor.
- **Panel de administración de pagos** con visualización de evidencia y gestión de devoluciones.
- **Conversión de moneda** en tiempo real durante el proceso de pago.

---

## Arquitectura

```
┌────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│  API Gateway  │────▶│  Auth Service    │ :50051
│  (React)    │     │  (Express)    │────▶│  Restaurant Svc  │ :50052
│  :5173      │     │  :3000        │────▶│  Order Service   │ :50053
└────────────┘     │               │────▶│  Delivery Svc    │ :50054
                   │               │────▶│  Notification Svc│ :50055
                   │               │────▶│  FX Service ★    │ :50056
                   │               │────▶│  Payment Svc ★   │ :50057
                   └──────────────┘     └─────────────────┘
                                              │
                                        ┌─────▼─────┐
                                        │   Redis    │ :6379
                                        │  (Cache)   │
                                        └───────────┘
```

★ = Nuevos servicios agregados en P5

---

## Microservicios Nuevos

### FX-Service (Tipo de Cambio) - Puerto 50056

**Tecnología**: Python 3.11 + Flask + gRPC + Redis

**Funcionalidad**:
- Consulta tipos de cambio desde API externa (exchangerate-api.com)
- Cache de dos niveles en Redis:
  - Cache corto (6 minutos) para tasas recientes
  - Cache largo (24 horas) como fallback
- Tasas de respaldo hardcodeadas si falla todo
- Soporte para conversión de múltiples monedas simultáneamente

**RPCs (gRPC)**:
| RPC | Descripción |
|-----|-------------|
| `GetExchangeRate` | Obtiene tasa de cambio y monto convertido entre dos monedas |
| `GetMultipleRates` | Obtiene tasas de cambio de una moneda base a múltiples destinos |

**Monedas soportadas**: GTQ, USD, EUR, MXN, GBP, JPY, CAD, BRL, COP, ARS, PEN, CLP, CRC

### Payment-Service (Pagos) - Puerto 50057

**Tecnología**: Node.js 18 + gRPC + PostgreSQL (embebido)

**Funcionalidad**:
- Procesamiento simulado de pagos
- Soporte para 3 tipos de pago:
  - **Tarjeta de Crédito**: Simulación con validación de número
  - **Tarjeta de Débito**: Simulación con validación de número
  - **Cartera Digital**: Simulación de saldo (máx. Q5,000)
- Almacenamiento de monto convertido y tasa de cambio
- Gestión de devoluciones por administrador

**RPCs (gRPC)**:
| RPC | Descripción |
|-----|-------------|
| `ProcessPayment` | Procesa un pago para una orden |
| `GetPaymentStatus` | Consulta el estado de un pago por orden |
| `ApproveRefund` | Aprueba una devolución (solo admin) |
| `ListPayments` | Lista todos los pagos (solo admin) |

**Reglas de simulación**:
- Tarjetas terminadas en "0000" → Rechazado
- Montos > Q10,000 → Rechazado
- Cartera digital > Q5,000 → Saldo insuficiente

---

## Endpoints REST (API Gateway)

### Pagos
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/payments` | CLIENTE | Procesar pago |
| GET | `/api/payments/:orderId` | CLIENTE, ADMIN | Consultar pago |
| GET | `/api/payments` | ADMINISTRADOR | Listar todos los pagos |
| POST | `/api/payments/refund` | ADMINISTRADOR | Aprobar devolución |

### Tipo de Cambio
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/fx/rate?from=USD&to=GTQ&amount=100` | Autenticado | Obtener tipo de cambio |
| GET | `/api/fx/rates?base=GTQ&currencies=USD,EUR` | Autenticado | Múltiples tasas |

### Evidencia de Entrega
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/delivery/evidence` | REPARTIDOR | Subir foto de evidencia |
| GET | `/api/delivery/evidence/:orderId` | Autenticado | Ver evidencia |
| GET | `/api/delivery/all` | ADMINISTRADOR | Listar todas las entregas |

---

## Páginas del Frontend (React)

### PaymentPage (`/payment?order_id=X`)
- Formulario de pago con selección de tipo (tarjeta/cartera digital)
- Selector de moneda con conversión en tiempo real via FX-Service
- Muestra tipo de cambio y monto convertido
- Campos condicionales según tipo de pago

### DeliveryEvidence (`/delivery-evidence`)
- Lista de entregas EN_CAMINO del repartidor
- Upload de foto con preview
- Campo de notas opcionales
- Al subir evidencia, marca la entrega como ENTREGADA

### AdminPayments (`/admin/payments`)
- Tabla de todos los pagos con filtros
- Tabla de todas las entregas
- Modal para ver evidencia fotográfica
- Botón de devolución para pagos completados

---

## Base de Datos

### payment-service (payment_db)
```sql
CREATE TYPE payment_type AS ENUM ('TARJETA_CREDITO', 'TARJETA_DEBITO', 'CARTERA_DIGITAL');
CREATE TYPE payment_status AS ENUM ('PENDIENTE', 'COMPLETADO', 'RECHAZADO', 'REEMBOLSADO');

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    payment_type payment_type NOT NULL,
    card_last_four VARCHAR(4),
    amount DECIMAL(10,2) NOT NULL,
    converted_amount DECIMAL(10,2),
    converted_currency VARCHAR(3) DEFAULT 'GTQ',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    status payment_status DEFAULT 'PENDIENTE',
    transaction_id VARCHAR(100),
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### delivery-service (delivery_db) - Tabla nueva
```sql
CREATE TABLE delivery_evidence (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES deliveries(id),
    order_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    photo_original_name VARCHAR(255),
    photo_mime_type VARCHAR(100),
    photo_size_bytes INTEGER,
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(delivery_id)
);
```

---

## Docker

### Servicios nuevos en docker-compose.yml
- `fx-service`: Python 3.11, puertos 50056 (gRPC) y 5000 (Flask health)
- `payment-service`: Node.js 18 con PostgreSQL embebido, puerto 50057
- `redis`: Redis 7 Alpine, puerto 6379
- Volume `evidence-uploads`: Persistencia de fotos de evidencia
- Volume `payment-db-data`: Persistencia de la base de datos de pagos
- Volume `redis-data`: Persistencia de cache Redis

### Levantar el proyecto
```bash
docker-compose up --build
```

---

## Flujo de Pago

1. Cliente crea una orden → estado CREADA
2. Cliente va a "Mis Órdenes" y presiona "Pagar"
3. Selecciona tipo de pago (tarjeta crédito/débito o cartera digital)
4. Opcionalmente selecciona otra moneda (USD, EUR, etc.)
5. Si selecciona moneda extranjera, se consulta tipo de cambio en FX-Service
6. Se envía pago a Payment-Service
7. Si es exitoso, la orden se actualiza a PAGADA
8. Restaurante prepara la orden → LISTA
9. Repartidor acepta → EN_CAMINO
10. Repartidor sube foto de evidencia → ENTREGADA
11. Administrador puede ver evidencia y aprobar devoluciones

---

## Tag

Esta práctica corresponde al tag `v1.2.0` del repositorio del proyecto.
