# 📚 Documentación — Proyecto Fase 2: Delivereats

## Plataforma de Delivery de Comida — Microservicios

**Universidad de San Carlos de Guatemala**
**Facultad de Ingeniería**
**Escuela de Ciencias y Sistemas**

| Dato | Valor |
|------|-------|
| **Nombre** | José Alberto Alarcón Chigua |
| **Carné** | 201346084 |
| **Curso** | Software Avanzado A |
| **Semestre** | 1er Semestre 2026 |

---

## 📋 Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Microservicios Implementados](#2-microservicios-implementados)
3. [Nuevas Funcionalidades Fase 2](#3-nuevas-funcionalidades-fase-2)
4. [Diagrama Entidad-Relación](#4-diagrama-entidad-relación)
5. [Infraestructura Kubernetes](#5-infraestructura-kubernetes)
6. [Pipeline CI/CD](#6-pipeline-cicd)
7. [Estrategias de Rollout y Rollback](#7-estrategias-de-rollout-y-rollback)
8. [Pruebas Unitarias](#8-pruebas-unitarias)
9. [Frontend — Flujos Integrados](#9-frontend--flujos-integrados)
10. [Flujo JWT y Autorización](#10-flujo-jwt-y-autorización)
11. [Sistema de Colas — RabbitMQ](#11-sistema-de-colas--rabbitmq)
12. [Guía de Despliegue](#12-guía-de-despliegue)

---

## 1. Arquitectura General

### 1.1 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + React Router |
| API Gateway | Express.js + JWT + gRPC clients |
| Microservicios (7 Node.js) | gRPC + PostgreSQL embebido |
| Microservicio Python | Flask + gRPC (fx-service) |
| Mensajería | RabbitMQ (AMQP) |
| Cache | Redis |
| Orquestación | k3s (Kubernetes ligero) en GCP |
| CI/CD | GitHub Actions → GHCR → SSH deploy |
| Cloud | Google Cloud Platform (VM e2-medium) |

### 1.2 Diagrama de Arquitectura

```mermaid
graph TB
    subgraph "Internet"
        CLIENT["👤 Usuario<br/>(Navegador)"]
    end

    subgraph "GCP VM — k3s Cluster"
        subgraph "Ingress NGINX"
            ING["☁️ Ingress Controller"]
        end

        subgraph "Frontend"
            FE["🖥️ React 18 + Vite<br/>Nginx :80"]
        end

        subgraph "API Layer"
            GW["🔀 API Gateway<br/>Express.js :3000<br/>JWT · Roles · REST"]
        end

        subgraph "Microservicios gRPC"
            AUTH["🔐 Auth<br/>:50051"]
            REST_SVC["📋 Restaurant<br/>:50052"]
            ORD["📦 Order<br/>:50053"]
            DEL["🚚 Delivery<br/>:50054"]
            NOTIF["📧 Notification<br/>:50055"]
            FX["💱 FX Service<br/>:50056 (Python)"]
            PAY["💳 Payment<br/>:50057"]
        end

        subgraph "Infrastructure"
            MQ["🐇 RabbitMQ<br/>AMQP :5672"]
            REDIS["⚡ Redis<br/>:6379"]
        end

        subgraph "Databases (independientes)"
            AUTH_DB[("auth_db")]
            REST_DB[("restaurant_db")]
            ORD_DB[("order_db")]
            DEL_DB[("delivery_db")]
            PAY_DB[("payment_db")]
        end
    end

    CLIENT -->|HTTP| ING
    ING -->|/| FE
    ING -->|/api| GW

    GW -->|gRPC| AUTH
    GW -->|gRPC| REST_SVC
    GW -->|gRPC| ORD
    GW -->|gRPC| DEL
    GW -->|gRPC| FX
    GW -->|gRPC| PAY

    ORD -->|"publish (async)"| MQ
    MQ -->|"consume (async)"| REST_SVC
    ORD -.->|gRPC| NOTIF
    DEL -.->|gRPC| ORD

    FX -->|cache| REDIS

    AUTH --> AUTH_DB
    REST_SVC --> REST_DB
    ORD --> ORD_DB
    DEL --> DEL_DB
    PAY --> PAY_DB

    NOTIF -->|SMTP| SMTP["📨 Gmail"]
```

### 1.3 Comunicación entre Servicios

| Tipo | Protocolo | Uso |
|------|-----------|-----|
| Síncrona | gRPC (Protocol Buffers) | API Gateway ↔ Microservicios |
| Asíncrona | AMQP (RabbitMQ) | Order → Restaurant (cola de pedidos) |
| Cache | Redis | FX Service (tasas de cambio) |
| Externa | REST/SMTP | FX API externa, Gmail |

---

## 2. Microservicios Implementados

### 2.1 Resumen

| # | Servicio | Puerto | Lenguaje | Base de Datos | Descripción |
|---|----------|--------|----------|---------------|-------------|
| 1 | auth-service | 50051 | Node.js | auth_db | Registro, login, JWT, roles |
| 2 | restaurant-catalog-service | 50052 | Node.js | restaurant_db | CRUD restaurantes, menú, promociones, búsqueda |
| 3 | order-service | 50053 | Node.js | order_db | Gestión de órdenes, publicación RabbitMQ |
| 4 | delivery-service | 50054 | Node.js | delivery_db | Asignación y tracking de entregas, evidencia fotográfica |
| 5 | notification-service | 50055 | Node.js | — | Notificaciones email vía SMTP |
| 6 | fx-service | 50056 | Python | — | Conversión de monedas con cache Redis |
| 7 | payment-service | 50057 | Node.js | payment_db | Pagos, cupones, wallet recargable |
| 8 | api-gateway | 3000 | Node.js | — | REST → gRPC, JWT middleware, roles |
| 9 | frontend | 80 | React 18 | — | SPA con Nginx |

### 2.2 Protobuf Definitions

Cada servicio define su interfaz en archivos `.proto`:

| Archivo | RPCs principales |
|---------|-----------------|
| `proto/auth.proto` | Register, Login, ValidateToken, GetUsers |
| `proto/restaurant.proto` | ListRestaurants, GetRestaurant, CreateRestaurant, AddMenuItem, CreatePromotion, ListPromotions, DeletePromotion, SearchRestaurants |
| `proto/order.proto` | CreateOrder, GetMyOrders, GetRestaurantOrders, UpdateOrderStatus, GetAllOrders, RateOrder |
| `proto/delivery.proto` | AcceptOrder, UpdateDeliveryStatus, GetMyDeliveries, GetDeliveryByOrder, UploadEvidence |
| `proto/notification.proto` | SendNotification |
| `proto/fx.proto` | Convert, GetRates |
| `proto/payment.proto` | ProcessPayment, CreateCoupon, ListCoupons, DeleteCoupon, ValidateCoupon, GetWalletBalance, RechargeWallet, GetWalletTransactions |

---

## 3. Nuevas Funcionalidades Fase 2

### 3.1 Sistema de Pagos y Cupones (2.5 pts)

**Métodos de pago soportados:**
- Efectivo
- Tarjeta de crédito/débito (simulación)
- Wallet (saldo recargable)

**Cupones:**
- CRUD completo para administradores
- Descuentos porcentuales y fijos
- Validación por código, fecha de expiración, y uso máximo
- Aplicación automática en el checkout

**Wallet Recargable:**
- Saldo por cliente en `payment_db`
- Recarga con validación de monto > 0
- Consulta de balance en tiempo real
- Historial de transacciones (recargas y débitos)
- Verificación de saldo suficiente al pagar

### 3.2 Conversión de Moneda — FX Service + Redis (10 pts)

**Arquitectura:**
- FX Service en **Python** (Flask + gRPC)
- Consulta API externa de tasas de cambio
- **Cache en Redis** con doble TTL:
  - Short TTL (5min): para tasas frescas
  - Long TTL (24h): fallback si la API falla
- Monedas soportadas: GTQ, USD, EUR, MXN, y más

**Flujo:**
```
Frontend → API Gateway → FX Service → Redis (cache hit?)
                                         ├─ Sí → retorna cached
                                         └─ No → API externa → guarda en Redis → retorna
```

### 3.3 Sistema de Calificaciones (5 pts)

**Calificaciones por:**
- Restaurante (1-5 estrellas + comentario)
- Repartidor (1-5 estrellas + comentario)
- Producto/orden (1-5 estrellas + comentario)

**Implementación:**
- Tablas `ratings` en order_db (restaurant_rating, delivery_rating, product_rating)
- RPC `RateOrder` en order-service
- Promedio visible en el catálogo de restaurantes
- UI con estrellas interactivas en "Mis Pedidos"

### 3.4 Evidencia de Entrega — Fotografía (2.5 pts)

**Flujo:**
1. Repartidor sube foto vía API Gateway (`multipart/form-data`)
2. Archivo se guarda en PVC (`evidence-uploads-pvc`)
3. Se registra path en delivery_db
4. Cliente ve la foto como prueba de entrega

**Almacenamiento:**
- PVC de 2Gi montado en `/app/uploads`
- Servido vía Ingress en ruta `/uploads`

### 3.5 Colas de Pedidos — RabbitMQ (10 pts)

**Componentes:**
- Exchange: `orders_exchange` (direct, durable)
- Cola: `new_orders` (durable)
- Mensajes: persistentes (deliveryMode: 2)

**Flujo:**
1. Order-Service crea orden en DB
2. Publica mensaje JSON en `orders_exchange`
3. Restaurant-Service consume de `new_orders`
4. Confirma procesamiento (ACK)

**Resiliencia:**
- Cola durable (sobrevive restart del broker)
- Mensajes persistentes
- ACK manual (garantiza procesamiento)
- Reconexión automática con backoff exponencial

### 3.6 Promociones y Búsqueda (Funcionalidades P6)

**Promociones:**
- CRUD de promociones por restaurante
- Tipos: porcentaje y monto fijo
- Fechas inicio/fin, estado activo/inactivo
- Badges visuales en tarjetas de restaurante

**Búsqueda y Filtros:**
- Búsqueda por nombre de restaurante
- Filtro por tipo de comida
- Filtro por restaurantes con promociones activas
- Filtro por mejor puntuados
- Filtro por más recientes

---

## 4. Diagrama Entidad-Relación

### 4.1 Diagrama ER Completo (5 DBs independientes)

```mermaid
erDiagram
    %% ===== AUTH DB =====
    USERS {
        serial id PK
        varchar email UK
        varchar password "bcrypt hash"
        varchar name
        varchar role "CLIENTE|RESTAURANTE|REPARTIDOR|ADMINISTRADOR"
        timestamp created_at
    }

    %% ===== RESTAURANT DB =====
    RESTAURANTS {
        serial id PK
        varchar name
        varchar address
        varchar phone
        varchar schedule
        varchar food_type
        integer owner_id
        timestamp created_at
    }

    MENU_ITEMS {
        serial id PK
        integer restaurant_id FK
        varchar name
        text description
        decimal price
        boolean available
        varchar category
        timestamp created_at
    }

    PROMOTIONS {
        serial id PK
        integer restaurant_id FK
        varchar title
        text description
        varchar discount_type "percentage|fixed"
        decimal discount_value
        timestamp starts_at
        timestamp ends_at
        boolean active
        timestamp created_at
    }

    RESTAURANTS ||--o{ MENU_ITEMS : "tiene"
    RESTAURANTS ||--o{ PROMOTIONS : "ofrece"

    %% ===== ORDER DB =====
    ORDERS {
        serial id PK
        integer customer_id
        integer restaurant_id
        integer address_id
        varchar status "CREADA|EN_PROCESO|LISTA|EN_CAMINO|ENTREGADA|RECHAZADA"
        decimal subtotal
        decimal delivery_fee
        decimal tax
        decimal total
        varchar payment_method
        text notes
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        serial id PK
        integer order_id FK
        integer menu_item_id
        integer quantity
        decimal unit_price
        decimal subtotal
        text special_notes
    }

    RATINGS {
        serial id PK
        integer order_id FK
        integer customer_id
        integer restaurant_id
        integer delivery_person_id
        integer restaurant_rating
        text restaurant_comment
        integer delivery_rating
        text delivery_comment
        integer product_rating
        text product_comment
        timestamp created_at
    }

    ORDERS ||--o{ ORDER_ITEMS : "contiene"
    ORDERS ||--o| RATINGS : "calificada"

    %% ===== DELIVERY DB =====
    DELIVERIES {
        serial id PK
        integer order_id UK
        integer delivery_person_id
        varchar delivery_person_name
        varchar status "EN_CAMINO|ENTREGADA|CANCELADA"
        varchar evidence_photo_url
        timestamp accepted_at
        timestamp delivered_at
    }

    %% ===== PAYMENT DB =====
    PAYMENTS {
        serial id PK
        integer order_id
        integer customer_id
        decimal amount
        varchar currency
        varchar method "EFECTIVO|TARJETA|WALLET"
        varchar status "COMPLETADO|FALLIDO|PENDIENTE"
        varchar coupon_code
        decimal discount_applied
        timestamp created_at
    }

    COUPONS {
        serial id PK
        varchar code UK
        varchar discount_type "percentage|fixed"
        decimal discount_value
        decimal min_purchase
        integer max_uses
        integer current_uses
        timestamp expires_at
        boolean active
        timestamp created_at
    }

    WALLETS {
        serial id PK
        integer customer_id UK
        decimal balance
        timestamp created_at
        timestamp updated_at
    }

    WALLET_TRANSACTIONS {
        serial id PK
        integer wallet_id FK
        varchar type "RECHARGE|DEBIT"
        decimal amount
        text description
        timestamp created_at
    }

    WALLETS ||--o{ WALLET_TRANSACTIONS : "historial"
```

---

## 5. Infraestructura Kubernetes

### 5.1 Cluster k3s en GCP

| Componente | Valor |
|-----------|-------|
| Plataforma | Google Cloud Platform |
| VM | `delivereats-vm` (e2-medium, 2 vCPU, 4 GB RAM) |
| Zona | us-central1-a |
| K8s Distribution | k3s (lightweight) |
| Ingress Controller | NGINX Ingress |
| Namespace | `delivereats` |

### 5.2 Recursos Kubernetes

| Recurso | Cantidad | Detalle |
|---------|----------|---------|
| Namespace | 1 | `delivereats` |
| Deployments | 11 | 9 servicios + redis + rabbitmq |
| Services (ClusterIP) | 11 | Todos ClusterIP (no NodePort/LoadBalancer) |
| Ingress | 1 | NGINX, rutas /api, /uploads, / |
| ConfigMap | 1 | Variables de entorno no sensibles |
| Secret | 1 | JWT, DB passwords, SMTP credentials |
| PVCs | 8 | 5 DBs + Redis + RabbitMQ + uploads |

### 5.3 Detalle de Deployments

| Deployment | Réplicas | Puertos | PVC | Health Probes |
|-----------|----------|---------|-----|---------------|
| auth-service | 1 | 50051 | auth-db-pvc (1Gi) | readiness + liveness |
| restaurant-catalog-service | 1 | 50052 | restaurant-db-pvc (1Gi) | readiness |
| order-service | 1 | 50053 | order-db-pvc (1Gi) | readiness |
| delivery-service | 1 | 50054 | delivery-db-pvc (1Gi) | readiness |
| notification-service | 1 | 50055 | — | — |
| fx-service | 1 | 50056, 5000 | — | readiness + liveness (HTTP) |
| payment-service | 1 | 50057 | payment-db-pvc (1Gi) | readiness |
| api-gateway | 2 | 3000 | evidence-uploads-pvc (2Gi) | readiness + liveness (HTTP) |
| frontend | 2 | 80 | — | readiness + liveness (HTTP) |
| redis | 1 | 6379 | redis-pvc (500Mi) | readiness (redis-cli ping) |
| rabbitmq | 1 | 5672, 15672 | rabbitmq-pvc (500Mi) | readiness + liveness |

### 5.4 ConfigMap y Secrets

**ConfigMap (`delivereats-config`):**
```yaml
data:
  AUTH_SERVICE_HOST: "auth-service:50051"
  RESTAURANT_SERVICE_HOST: "restaurant-catalog-service:50052"
  ORDER_SERVICE_HOST: "order-service:50053"
  DELIVERY_SERVICE_HOST: "delivery-service:50054"
  NOTIFICATION_SERVICE_HOST: "notification-service:50055"
  FX_SERVICE_HOST: "fx-service:50056"
  PAYMENT_SERVICE_HOST: "payment-service:50057"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
  RABBITMQ_URL: "amqp://delivereats:***@rabbitmq:5672"
```

**Secret (`delivereats-secrets`):**
```yaml
stringData:
  JWT_SECRET: (valor sensible)
  DB_PASSWORD: (valor sensible)
  SMTP_USER: (email)
  SMTP_PASS: (app password)
  RABBITMQ_DEFAULT_USER: (usuario)
  RABBITMQ_DEFAULT_PASS: (contraseña)
```

### 5.5 Ingress Configuration

```yaml
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - path: /api          → api-gateway:3000
          - path: /uploads      → api-gateway:3000
          - path: /             → frontend:80
```

Anotaciones: CORS habilitado, proxy body size 10m, timeouts 60s.

---

## 6. Pipeline CI/CD

### 6.1 Herramientas

| Componente | Tecnología |
|-----------|-----------|
| CI/CD | GitHub Actions |
| Registry | GitHub Container Registry (ghcr.io) |
| Deploy | SSH a VM con k3s |
| Secrets | GitHub Secrets (encriptados) |

### 6.2 Flujo del Pipeline

```mermaid
flowchart LR
    A["Push a main"] --> B["Job 1: Test<br/>7 Node.js + 1 Python"]
    B --> C{"¿Tests pasan?"}
    C -->|No| D["❌ Pipeline falla<br/>(fail-fast: true)"]
    C -->|Sí| E["Job 2: Build & Push<br/>9 imágenes Docker"]
    E --> F["Push a ghcr.io<br/>tags: sha, latest, run#"]
    F --> G["Job 3: Deploy<br/>SSH a VM k3s"]
    G --> H["kubectl apply<br/>kubectl set image"]
    H --> I{"¿Pods healthy?"}
    I -->|No| J["🔄 Auto-rollback"]
    I -->|Sí| K["✅ Deploy exitoso"]
```

### 6.3 Jobs del Pipeline

**Job 1 — Test (paralelo):**
- Matrix de 7 servicios Node.js: `npm test --coverage --forceExit`
- FX Service Python: `pytest tests/ -v --cov`
- `fail-fast: true` — si un test falla, se cancela todo
- `continue-on-error: false` — no continúa con jobs siguientes

**Job 2 — Build & Push:**
- Solo en push a `main` (no en PRs)
- 9 servicios en matrix (incluye frontend)
- Push a `ghcr.io` con tags: SHA del commit, `latest`, número de run
- Login con `GITHUB_TOKEN` (secreto automático)

**Job 3 — Deploy via SSH:**
- Configura clave SSH desde `VM_SSH_KEY` secret
- Copia manifests K8s a la VM via SCP
- SSH: `kubectl apply` todos los manifests
- SSH: `kubectl set image` con SHA del commit
- Verificación: lista deployments, pods, services, ingress
- **Rollback automático** si falla: `kubectl rollout undo`
- Limpieza de clave SSH al finalizar

### 6.4 GitHub Secrets Requeridos

| Secret | Descripción |
|--------|-------------|
| `VM_SSH_KEY` | Clave privada SSH para acceder a la VM |
| `VM_HOST` | IP de la VM GCP |
| `VM_USER` | Usuario SSH de la VM |
| `GHCR_TOKEN` | Token para pull de imágenes desde k3s |

### 6.5 Versionamiento de Imágenes

Cada imagen se tagea con 3 identificadores:
1. **SHA del commit** — trazabilidad exacta
2. **`latest`** — siempre la versión más reciente
3. **Número de run** — numeración secuencial

---

## 7. Estrategias de Rollout y Rollback

### 7.1 Estrategia: RollingUpdate

Todos los deployments usan `RollingUpdate`:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0    # Nunca dejar sin réplicas
    maxSurge: 1          # Máximo 1 pod extra durante update
```

**Comportamiento:**
1. K8s crea 1 pod nuevo con la nueva imagen
2. Espera a que pase `readinessProbe`
3. Redirige tráfico al nuevo pod
4. Termina el pod viejo
5. Repite hasta actualizar todos

### 7.2 Rollback Manual

```bash
# Ver historial
kubectl rollout history deployment/api-gateway -n delivereats

# Rollback a versión anterior
kubectl rollout undo deployment/api-gateway -n delivereats

# Rollback a revisión específica
kubectl rollout undo deployment/api-gateway --to-revision=2 -n delivereats
```

### 7.3 Rollback Automático en CI/CD

El pipeline ejecuta rollback si el deploy falla:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    for svc in $SERVICES; do
      sudo kubectl rollout undo deployment/$svc -n delivereats || true
    done
```

### 7.4 Comparación de Estrategias

| Estrategia | Downtime | Uso | Elegida |
|------------|----------|-----|---------|
| **RollingUpdate** | Zero | Producción | ✅ |
| Recreate | Sí | Dev/Test | — |
| Blue/Green | Zero | Releases críticos | — |
| Canary | Zero | Features experimentales | — |

---

## 8. Pruebas Unitarias

### 8.1 Resumen de Cobertura

| Servicio | Framework | Tests | Estado |
|----------|-----------|-------|--------|
| auth-service | Jest | 12 | ✅ Pass |
| restaurant-catalog-service | Jest | 22 | ✅ Pass |
| order-service | Jest | 15 | ✅ Pass |
| delivery-service | Jest | 19 | ✅ Pass |
| notification-service | Jest | 11 | ✅ Pass |
| payment-service | Jest | 20 | ✅ Pass |
| api-gateway | Jest + Supertest | 42 | ✅ Pass |
| fx-service | Pytest | 18 | ✅ Pass |
| **TOTAL** | | **159** | **✅ All Pass** |

### 8.2 Qué se cubre

- **auth-service (12):** Register, login, validate token, get users, duplicate email, wrong password, invalid token
- **restaurant-catalog-service (22):** CRUD restaurants, menu items, search by name/food_type, promotions CRUD, list with filters
- **order-service (15):** Create order, list orders, update status, rate order, get all (admin), validation errors
- **delivery-service (19):** Accept delivery, update status, get by order, upload evidence, my deliveries
- **notification-service (11):** Send email, template rendering, SMTP errors, missing fields
- **payment-service (20):** Process payment (efectivo/tarjeta/wallet), coupons CRUD, validate coupon, wallet balance, recharge, transactions
- **api-gateway (42):** Health check, auth routes, restaurant routes (CRUD + search + promotions), order routes, delivery routes, payment routes (process + wallet + FX + coupons), error handling, authorization
- **fx-service (18):** Convert currencies, get rates, Redis cache hit/miss, API fallback, invalid currency, error handling

### 8.3 Ejecución

```bash
# Todos los servicios Node.js
for svc in auth-service restaurant-catalog-service order-service delivery-service \
           notification-service payment-service api-gateway; do
  cd $svc && npm test -- --coverage --forceExit && cd ..
done

# FX Service (Python)
cd fx-service && pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## 9. Frontend — Flujos Integrados

### 9.1 Páginas y Roles

| Página | Ruta | Rol | Funcionalidad |
|--------|------|-----|--------------|
| Login | `/login` | Público | Email + password |
| Register | `/register` | Público | Registro con selección de rol |
| Dashboard Cliente | `/client` | CLIENTE | Ver restaurantes, buscar, filtrar |
| Menú Restaurante | `/restaurant/:id` | CLIENTE | Ver menú, reviews, agregar al carrito |
| Mis Pedidos | `/my-orders` | CLIENTE | Ver pedidos, calificar, ver evidencia |
| Pago | `/payment` | CLIENTE | Método de pago, cupones, wallet, FX |
| Dashboard Restaurante | `/restaurant-dashboard` | RESTAURANTE | Pedidos, menú, promociones |
| Dashboard Repartidor | `/delivery-dashboard` | REPARTIDOR | Pedidos disponibles, subir evidencia |
| Dashboard Admin | `/admin` | ADMINISTRADOR | Usuarios, restaurantes, cupones |

### 9.2 Flujos Nuevos de Fase 2

**Pago con Wallet:**
1. Cliente selecciona "Wallet" como método de pago
2. Se muestra saldo actual en tiempo real
3. Si saldo insuficiente → formulario de recarga inline
4. Recarga → se actualiza balance → puede pagar

**Calificaciones:**
1. Cliente va a "Mis Pedidos"
2. En pedidos entregados aparece "Calificar"
3. Selecciona estrellas (1-5) para restaurante, repartidor, producto
4. Agrega comentario opcional
5. Promedio visible en catálogo de restaurantes

**Búsqueda y Filtros:**
1. Barra de búsqueda en Dashboard Cliente
2. Botones: Nuevos, Destacados, Mejor Puntuados, Con Promociones
3. Dropdown de tipo de comida
4. Badges de promoción en tarjetas

**Gestión de Promociones (Restaurante):**
1. Restaurante crea promoción (título, tipo descuento, valor, fechas)
2. Se muestra como badge en el catálogo público
3. Clientes filtran por "Con Promociones"

---

## 10. Flujo JWT y Autorización

### 10.1 Ciclo de Vida del Token

```mermaid
sequenceDiagram
    actor U as Usuario
    participant FE as Frontend
    participant GW as API Gateway
    participant AS as Auth Service

    U->>FE: Login (email + password)
    FE->>GW: POST /api/auth/login
    GW->>AS: gRPC Login
    AS->>AS: bcrypt.compare + jwt.sign
    AS-->>GW: {token, user}
    GW-->>FE: 200 OK
    FE->>FE: localStorage.setItem('token')

    U->>FE: Acción protegida
    FE->>GW: GET /api/orders<br/>Authorization: Bearer TOKEN
    GW->>AS: gRPC ValidateToken
    AS->>AS: jwt.verify(token, SECRET)
    AS-->>GW: {valid, user_id, role}
    GW->>GW: authorizeRoles check
    GW->>GW: Procesa request
```

### 10.2 Payload del Token

```json
{
  "id": 1,
  "email": "jose@test.com",
  "role": "CLIENTE",
  "name": "José Alberto",
  "iat": 1740451200,
  "exp": 1740537600
}
```

### 10.3 Matriz de Autorización

| Endpoint | CLIENTE | RESTAURANTE | REPARTIDOR | ADMIN |
|----------|---------|-------------|------------|-------|
| POST /auth/register | ✅ | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ | ✅ |
| GET /restaurants | ✅ | ✅ | ✅ | ✅ |
| GET /restaurants/search | ✅ | ✅ | ✅ | ✅ |
| POST /restaurants | — | — | — | ✅ |
| POST /orders | ✅ | — | — | — |
| GET /orders/my | ✅ | — | — | — |
| GET /orders/restaurant/:id | — | ✅ | — | — |
| PUT /orders/:id/status | — | ✅ | — | — |
| POST /delivery/accept | — | — | ✅ | — |
| GET /wallet | ✅ | — | — | — |
| POST /wallet/recharge | ✅ | — | — | — |
| POST /payments/coupons | — | — | — | ✅ |
| GET /orders/all | — | — | — | ✅ |

---

## 11. Sistema de Colas — RabbitMQ

### 11.1 Arquitectura

| Componente | Detalle |
|-----------|---------|
| Exchange | `orders_exchange` (direct, durable) |
| Cola | `new_orders` (durable) |
| Binding Key | `new_order` |
| Productor | order-service |
| Consumidor | restaurant-catalog-service |
| Mensajes | JSON, persistent (deliveryMode: 2) |

### 11.2 Flujo

```mermaid
sequenceDiagram
    participant OS as Order Service
    participant MQ as RabbitMQ
    participant RS as Restaurant Service

    OS->>OS: INSERT orden en DB
    OS->>MQ: publish("orders_exchange", "new_order", orderJSON)
    Note over MQ: Mensaje persistente en cola durable
    MQ-->>OS: ACK
    OS-->>OS: Retorna 201 Created

    Note over MQ,RS: Consumo asíncrono
    MQ->>RS: deliver(orderJSON)
    RS->>RS: Procesa orden
    RS->>MQ: ACK (confirma procesamiento)
```

### 11.3 Resiliencia

- **Cola durable**: sobrevive restart del broker
- **Mensajes persistentes**: se escriben a disco
- **ACK manual**: garantiza procesamiento antes de eliminar de la cola
- **Prefetch 1**: un mensaje a la vez por consumidor
- **Reconexión automática**: retry con backoff exponencial

---

## 12. Guía de Despliegue

### 12.1 Prerrequisitos

- VM en GCP con k3s instalado
- Docker para builds
- Acceso SSH configurado
- GitHub Secrets configurados (VM_SSH_KEY, VM_HOST, VM_USER, GHCR_TOKEN)

### 12.2 Despliegue Automático (CI/CD)

```bash
# Push a main dispara el pipeline automáticamente
git push origin main

# GitHub Actions ejecuta:
#   Job 1: Tests (paralelo, 8 servicios) ← fail-fast
#   Job 2: Build & Push a ghcr.io (9 imágenes con tags sha/latest/run#)
#   Job 3: SSH a VM → kubectl apply + kubectl set image
#   Verificación automática de pods
#   Rollback automático si algo falla
```

### 12.3 Despliegue Manual (backup)

```bash
# En la VM
cd ~/delivereats-deploy && git pull origin main

# Build e importar imágenes a k3s
SERVICES="auth-service restaurant-catalog-service order-service delivery-service \
          notification-service fx-service payment-service api-gateway frontend"
for svc in $SERVICES; do
  docker build -t delivereats-$svc ./$svc/
  docker save delivereats-$svc | sudo k3s ctr images import -
done

# Aplicar manifests y restart
sudo kubectl apply -f k8s/ -n delivereats
for svc in $SERVICES; do
  sudo kubectl rollout restart deployment/$svc -n delivereats
done

# Verificar
sudo kubectl get pods -n delivereats
```

### 12.4 Verificación

```bash
# Pods running
kubectl get pods -n delivereats

# Test health endpoint
curl http://<VM_IP>/api/health

# Test login
curl -X POST http://<VM_IP>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Ver logs
kubectl logs deployment/api-gateway -n delivereats
kubectl logs deployment/order-service -n delivereats
```
