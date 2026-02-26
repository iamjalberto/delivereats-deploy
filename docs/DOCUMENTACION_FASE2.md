# 📚 Documentación — Práctica 4: Actualización de Documentación y Testeo de Colas

## Delivereats — Transición a Fase 2

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

1. [Requerimientos Funcionales Actualizados](#1-requerimientos-funcionales-actualizados)
2. [Requerimientos No Funcionales Actualizados](#2-requerimientos-no-funcionales-actualizados)
3. [Diagrama de Arquitectura de Alto Nivel (Actualizado)](#3-diagrama-de-arquitectura-de-alto-nivel-actualizado)
4. [Diagrama de Despliegue en Kubernetes](#4-diagrama-de-despliegue-en-kubernetes)
5. [Diagrama Entidad-Relación Actualizado](#5-diagrama-entidad-relación-actualizado)
6. [Diagramas de Actividades / Secuencia Actualizados](#6-diagramas-de-actividades--secuencia-actualizados)
7. [Guía de Despliegue en Kubernetes (Paso a Paso)](#7-guía-de-despliegue-en-kubernetes-paso-a-paso)
8. [Estrategias de Rollout y Rollback](#8-estrategias-de-rollout-y-rollback)
9. [Descripción del Pipeline CI/CD](#9-descripción-del-pipeline-cicd)
10. [Descripción del Flujo JWT](#10-descripción-del-flujo-jwt)
11. [Prueba de Concepto — RabbitMQ](#11-prueba-de-concepto--rabbitmq)

---

## 1. Requerimientos Funcionales Actualizados

### 1.1 Cambios respecto a Fase 1

En la Fase 2 se agregan requerimientos relacionados con **comunicación asíncrona** mediante colas de mensajería y la preparación para **orquestación con Kubernetes**.

### 1.2 Nuevos Requerimientos Funcionales

| ID | Requerimiento | Descripción | Estado |
|----|---------------|-------------|--------|
| RF-MQ-01 | Publicación de órdenes en cola | Al crear una orden, el Order-Service publica un mensaje en RabbitMQ | ✅ PoC |
| RF-MQ-02 | Consumo de órdenes por restaurante | El Restaurant-Service consume mensajes de la cola y los registra | ✅ PoC |
| RF-MQ-03 | Cola durable | Los mensajes persisten en la cola si el consumidor no está disponible | ✅ PoC |
| RF-MQ-04 | Confirmación de procesamiento (ACK) | El consumidor confirma el procesamiento del mensaje | ✅ PoC |
| RF-K8S-01 | Despliegue en Kubernetes | Todos los microservicios se despliegan como Pods en un clúster K8s | 📋 Diseñado |
| RF-K8S-02 | Escalabilidad horizontal | Los servicios pueden escalar réplicas de forma independiente | 📋 Diseñado |
| RF-CICD-01 | Pipeline CI/CD | Build, test y deploy automatizado con GitHub Actions | 📋 Diseñado |

### 1.3 Requerimientos Funcionales Existentes (sin cambios)

Los siguientes módulos se mantienen tal cual de la Fase 1:

| Módulo | IDs | Estado |
|--------|-----|--------|
| Autenticación (Auth Service) | RF-AUTH-01 a RF-AUTH-06 | ✅ Implementado |
| Catálogo (Restaurant Catalog Service) | RF-CAT-01 a RF-CAT-06 | ✅ Implementado |
| Órdenes (Order Service) | RF-ORD-01 a RF-ORD-09 | ✅ Implementado |
| Entregas (Delivery Service) | RF-DEL-01 a RF-DEL-04 | ✅ Implementado |
| Notificaciones (Notification Service) | RF-NOT-01 a RF-NOT-06 | ✅ Implementado |

---

## 2. Requerimientos No Funcionales Actualizados

### 2.1 Nuevos RNF para Fase 2

#### Comunicación Asíncrona

| ID | Requerimiento | Implementación |
|----|---------------|----------------|
| RNF-MQ-01 | Mensajería asíncrona | RabbitMQ como broker de mensajes entre servicios |
| RNF-MQ-02 | Mensajes persistentes | Cola durable con mensajes `persistent: true` |
| RNF-MQ-03 | Reconexión automática | Retry con backoff exponencial al perder conexión con RabbitMQ |
| RNF-MQ-04 | Desacoplamiento temporal | El productor y consumidor no necesitan estar activos simultáneamente |

#### Orquestación y Escalabilidad

| ID | Requerimiento | Implementación |
|----|---------------|----------------|
| RNF-K8S-01 | Orquestación de contenedores | Kubernetes para gestión de Pods, Services y Deployments |
| RNF-K8S-02 | Service Discovery | Services de Kubernetes (ClusterIP) para descubrimiento entre servicios |
| RNF-K8S-03 | Health checks | Liveness y Readiness probes en cada Deployment |
| RNF-K8S-04 | Escalabilidad horizontal | HorizontalPodAutoscaler (HPA) por servicio |
| RNF-K8S-05 | Gestión de configuración | ConfigMaps para variables de entorno, Secrets para credenciales |

#### CI/CD

| ID | Requerimiento | Implementación |
|----|---------------|----------------|
| RNF-CICD-01 | Integración continua | GitHub Actions ejecuta build y tests en cada push |
| RNF-CICD-02 | Entrega continua | Deploy automático al clúster K8s tras merge a main |
| RNF-CICD-03 | Registro de imágenes | Docker images en GitHub Container Registry (ghcr.io) |
| RNF-CICD-04 | Rollback automático | Estrategia RollingUpdate con rollback en caso de fallo |

#### Seguridad

| ID | Requerimiento | Implementación |
|----|---------------|----------------|
| RNF-SEG-05 | Secrets en K8s | Credenciales de DB, JWT_SECRET y SMTP en Kubernetes Secrets |
| RNF-SEG-06 | Network Policies | Restricción de tráfico entre Pods a solo lo necesario |

### 2.2 RNF Existentes (actualizados)

| ID | Requerimiento | Fase 1 | Fase 2 |
|----|---------------|--------|--------|
| RNF-ESC-03 | Orquestación | Docker Compose | **Kubernetes** |
| RNF-DISP-01 | Despliegue en nube | GCP Compute Engine (VM) | **GKE (Google Kubernetes Engine)** |
| RNF-MANT-04 | Versionamiento | Git + Tag manual | **Git + CI/CD + Tag automático** |

---

## 3. Diagrama de Arquitectura de Alto Nivel (Actualizado)

### 3.1 Cambios respecto a Fase 1

- Se agrega **RabbitMQ** como broker de mensajes entre Order-Service y Restaurant-Service
- Se añade comunicación **asíncrona** además de la comunicación gRPC síncrona existente
- La infraestructura migra de Docker Compose a **Kubernetes**

### 3.2 Diagrama

```mermaid
graph TB
    subgraph "Capa de Presentación"
        CLIENT["👤 Usuario<br/>(Navegador Web)"]
    end

    subgraph "Capa de Frontend"
        FE["🖥️ Frontend<br/>React 18 + Vite<br/>Nginx"]
    end

    subgraph "Capa de API"
        GW["🔀 API Gateway<br/>Express.js<br/>JWT · Roles · REST"]
    end

    subgraph "Capa de Microservicios"
        AUTH["🔐 Auth Service<br/>gRPC :50051"]
        REST_SVC["📋 Restaurant Service<br/>gRPC :50052"]
        ORD["📦 Order Service<br/>gRPC :50053"]
        DEL["🚚 Delivery Service<br/>gRPC :50054"]
        NOTIF["📧 Notification Service<br/>gRPC :50055"]
    end

    subgraph "Capa de Mensajería"
        MQ["🐇 RabbitMQ<br/>Cola: new_orders<br/>AMQP :5672"]
    end

    subgraph "Capa de Datos"
        AUTH_DB[("Auth DB<br/>PostgreSQL")]
        REST_DB[("Restaurant DB<br/>PostgreSQL")]
        ORD_DB[("Order DB<br/>PostgreSQL")]
        DEL_DB[("Delivery DB<br/>PostgreSQL")]
    end

    subgraph "Servicios Externos"
        SMTP["📨 Gmail SMTP"]
    end

    CLIENT -->|HTTP| FE
    FE -->|REST/JSON| GW

    GW -->|gRPC| AUTH
    GW -->|gRPC| REST_SVC
    GW -->|gRPC| ORD
    GW -->|gRPC| DEL

    ORD -->|"publish (async)"| MQ
    MQ -->|"consume (async)"| REST_SVC

    ORD -.->|gRPC| NOTIF
    DEL -.->|gRPC| ORD

    AUTH --> AUTH_DB
    REST_SVC --> REST_DB
    ORD --> ORD_DB
    DEL --> DEL_DB

    NOTIF -->|SMTP/TLS| SMTP

    style MQ fill:#ff9800,stroke:#e65100,color:#fff
    style ORD fill:#e8f5e9,stroke:#388e3c
    style REST_SVC fill:#f3e5f5,stroke:#7b1fa2
    style GW fill:#fff9c4,stroke:#f9a825
```

### 3.3 Flujo de Comunicación Actualizado

```
[Navegador] ──REST/JSON──▶ [API Gateway :3000]
                                   │
                    ┌──────────────┼──────────────┬──────────────┐
                    │ gRPC         │ gRPC         │ gRPC         │ gRPC
                    ▼              ▼              ▼              ▼
              [Auth :50051]  [Catalog :50052] [Order :50053] [Delivery :50054]
                    │              ▲              │              │
                    ▼              │              ▼              ▼
              [Auth DB]           │         [Order DB]     [Deliv DB]
                                  │              │
                                  │    publish   │
                                  │    ┌─────────┘
                                  │    ▼
                              [RabbitMQ :5672]
                                  │    Cola: "new_orders"
                                  │    │
                              consume  │
                              ┌────────┘
                              ▼
                        [Restaurant DB]
                                           [Order :50053]
                                                │ gRPC
                                                ▼
                                        [Notification :50055]
                                                │ SMTP
                                                ▼
                                          [Gmail SMTP]
```

---

## 4. Diagrama de Despliegue en Kubernetes

### 4.1 Arquitectura K8s

```mermaid
graph TB
    subgraph "Internet"
        USER["👤 Usuario"]
    end

    subgraph "Google Kubernetes Engine (GKE)"
        subgraph "Ingress Controller"
            ING["☁️ Ingress<br/>NGINX Ingress Controller<br/>delivereats.example.com"]
        end

        subgraph "Namespace: delivereats"

            subgraph "Frontend"
                FE_DEP["Deployment: frontend<br/>replicas: 2"]
                FE_SVC["Service: frontend-svc<br/>ClusterIP :80"]
            end

            subgraph "API Gateway"
                GW_DEP["Deployment: api-gateway<br/>replicas: 2"]
                GW_SVC["Service: api-gateway-svc<br/>ClusterIP :3000"]
            end

            subgraph "Auth Service"
                AS_DEP["Deployment: auth-service<br/>replicas: 2"]
                AS_SVC["Service: auth-svc<br/>ClusterIP :50051"]
                AS_DB["StatefulSet: auth-db<br/>PostgreSQL<br/>replicas: 1"]
                AS_PVC["PVC: auth-db-pvc<br/>10Gi"]
            end

            subgraph "Restaurant Service"
                RS_DEP["Deployment: restaurant-service<br/>replicas: 2"]
                RS_SVC["Service: restaurant-svc<br/>ClusterIP :50052"]
                RS_DB["StatefulSet: restaurant-db<br/>PostgreSQL<br/>replicas: 1"]
                RS_PVC["PVC: restaurant-db-pvc<br/>10Gi"]
            end

            subgraph "Order Service"
                OS_DEP["Deployment: order-service<br/>replicas: 2"]
                OS_SVC["Service: order-svc<br/>ClusterIP :50053"]
                OS_DB["StatefulSet: order-db<br/>PostgreSQL<br/>replicas: 1"]
                OS_PVC["PVC: order-db-pvc<br/>10Gi"]
            end

            subgraph "Delivery Service"
                DS_DEP["Deployment: delivery-service<br/>replicas: 2"]
                DS_SVC["Service: delivery-svc<br/>ClusterIP :50054"]
                DS_DB["StatefulSet: delivery-db<br/>PostgreSQL<br/>replicas: 1"]
                DS_PVC["PVC: delivery-db-pvc<br/>10Gi"]
            end

            subgraph "Notification Service"
                NS_DEP["Deployment: notification-service<br/>replicas: 1"]
                NS_SVC["Service: notification-svc<br/>ClusterIP :50055"]
            end

            subgraph "RabbitMQ"
                MQ_SS["StatefulSet: rabbitmq<br/>replicas: 1"]
                MQ_SVC["Service: rabbitmq-svc<br/>ClusterIP :5672"]
                MQ_PVC["PVC: rabbitmq-pvc<br/>5Gi"]
            end

            CM["ConfigMap: delivereats-config"]
            SEC["Secret: delivereats-secrets"]
        end
    end

    USER -->|HTTPS| ING
    ING -->|/| FE_SVC
    ING -->|/api| GW_SVC
    FE_SVC --> FE_DEP
    GW_SVC --> GW_DEP
    GW_DEP -->|gRPC| AS_SVC
    GW_DEP -->|gRPC| RS_SVC
    GW_DEP -->|gRPC| OS_SVC
    GW_DEP -->|gRPC| DS_SVC
    OS_DEP -->|AMQP publish| MQ_SVC
    MQ_SVC -->|AMQP consume| RS_DEP
    AS_DEP --> AS_DB
    RS_DEP --> RS_DB
    OS_DEP --> OS_DB
    DS_DEP --> DS_DB
    AS_DB --> AS_PVC
    RS_DB --> RS_PVC
    OS_DB --> OS_PVC
    DS_DB --> DS_PVC
    MQ_SS --> MQ_PVC

    style MQ_SS fill:#ff9800,stroke:#e65100,color:#fff
    style ING fill:#4caf50,stroke:#2e7d32,color:#fff
```

### 4.2 Recursos de Kubernetes por Servicio

| Servicio | Tipo | Replicas | Puerto | Service Type |
|----------|------|----------|--------|-------------|
| frontend | Deployment | 2 | 80 | ClusterIP |
| api-gateway | Deployment | 2 | 3000 | ClusterIP |
| auth-service | Deployment | 2 | 50051 | ClusterIP |
| restaurant-service | Deployment | 2 | 50052 | ClusterIP |
| order-service | Deployment | 2 | 50053 | ClusterIP |
| delivery-service | Deployment | 2 | 50054 | ClusterIP |
| notification-service | Deployment | 1 | 50055 | ClusterIP |
| rabbitmq | StatefulSet | 1 | 5672/15672 | ClusterIP |
| auth-db | StatefulSet | 1 | 5432 | ClusterIP |
| restaurant-db | StatefulSet | 1 | 5432 | ClusterIP |
| order-db | StatefulSet | 1 | 5432 | ClusterIP |
| delivery-db | StatefulSet | 1 | 5432 | ClusterIP |
| ingress | Ingress | — | 80/443 | LoadBalancer |

### 4.3 ConfigMap y Secrets

**ConfigMap: `delivereats-config`**
```yaml
data:
  NODE_ENV: "production"
  AUTH_SERVICE_HOST: "auth-svc:50051"
  RESTAURANT_SERVICE_HOST: "restaurant-svc:50052"
  ORDER_SERVICE_HOST: "order-svc:50053"
  DELIVERY_SERVICE_HOST: "delivery-svc:50054"
  NOTIFICATION_SERVICE_HOST: "notification-svc:50055"
  RABBITMQ_URL: "amqp://rabbitmq-svc:5672"
  DB_PORT: "5432"
```

**Secret: `delivereats-secrets`**
```yaml
data:
  JWT_SECRET: (base64)
  DB_PASSWORD: (base64)
  RABBITMQ_PASSWORD: (base64)
  SMTP_USER: (base64)
  SMTP_PASS: (base64)
```

---

## 5. Diagrama Entidad-Relación Actualizado

### 5.1 Cambios respecto a Fase 1

- Se actualiza el esquema de **orders** para usar `customer_id` y `address_id` con tipos ENUM para `status` y `payment_method`
- Se actualizan **order_items** para incluir `unit_price` y `subtotal` calculado
- Se agrega el concepto de **mensajes de cola** (no se persiste en DB, es en memoria/RabbitMQ)

### 5.2 Diagrama ER Actualizado

```mermaid
erDiagram
    %% ===== AUTH DB =====
    USERS {
        serial id PK
        varchar email UK "NOT NULL"
        varchar password "NOT NULL (bcrypt hash)"
        varchar name "NOT NULL"
        varchar role "CLIENTE | RESTAURANTE | REPARTIDOR | ADMINISTRADOR"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    %% ===== RESTAURANT DB =====
    RESTAURANTS {
        serial id PK
        varchar name "NOT NULL"
        varchar address
        varchar phone
        varchar schedule
        varchar food_type
        integer owner_id "FK lógica → users.id"
        timestamp created_at
    }

    MENU_ITEMS {
        serial id PK
        integer restaurant_id FK "→ restaurants.id"
        varchar name "NOT NULL"
        text description
        decimal price "NOT NULL"
        boolean available "DEFAULT true"
        varchar category
        timestamp created_at
    }

    RESTAURANTS ||--o{ MENU_ITEMS : "tiene"

    %% ===== ORDER DB (ACTUALIZADO) =====
    ORDERS {
        serial id PK
        integer customer_id "NOT NULL - FK lógica → users.id"
        integer restaurant_id "NOT NULL - FK lógica → restaurants.id"
        integer address_id "NOT NULL"
        order_status status "CREADA | EN_PROCESO | FINALIZADA | RECHAZADA"
        decimal subtotal "DEFAULT 0.00"
        decimal delivery_fee "DEFAULT 15.00"
        decimal tax "DEFAULT 0.00"
        decimal total "DEFAULT 0.00"
        payment_method payment_method "EFECTIVO | TARJETA"
        text notes
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        serial id PK
        integer order_id FK "→ orders.id ON DELETE CASCADE"
        integer menu_item_id "NOT NULL - FK lógica → menu_items.id"
        integer quantity "NOT NULL CHECK > 0"
        decimal unit_price "NOT NULL"
        decimal subtotal "NOT NULL"
        text special_notes
        timestamp created_at
    }

    ORDERS ||--o{ ORDER_ITEMS : "contiene"

    %% ===== DELIVERY DB =====
    DELIVERIES {
        serial id PK
        integer order_id UK "FK lógica → orders.id"
        integer delivery_person_id "FK lógica → users.id"
        varchar delivery_person_name
        varchar status "EN_CAMINO | ENTREGADA | CANCELADA"
        timestamp accepted_at
        timestamp delivered_at
    }

    %% Relaciones lógicas inter-servicio
    USERS ||--o{ ORDERS : "crea (lógica)"
    USERS ||--o{ RESTAURANTS : "es dueño (lógica)"
    USERS ||--o{ DELIVERIES : "entrega (lógica)"
    RESTAURANTS ||--o{ ORDERS : "recibe (lógica)"
    ORDERS ||--o| DELIVERIES : "asignada a (lógica)"
```

### 5.3 SQL del Esquema de Orders Actualizado

```sql
-- ENUMS
CREATE TYPE order_status AS ENUM ('CREADA', 'EN_PROCESO', 'FINALIZADA', 'RECHAZADA');
CREATE TYPE payment_method AS ENUM ('EFECTIVO', 'TARJETA');

-- TABLA: ORDERS
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    address_id INTEGER NOT NULL,
    status order_status NOT NULL DEFAULT 'CREADA',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_method payment_method NOT NULL DEFAULT 'EFECTIVO',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: ORDER_ITEMS
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    special_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TRIGGER: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.4 Diferencias con Fase 1

| Campo | Fase 1 | Fase 2 (Actualizado) |
|-------|--------|---------------------|
| `orders.client_id` | VARCHAR (nombre incrustado) | `customer_id` INTEGER (FK lógica) |
| `orders.status` | VARCHAR libre | **ENUM** `order_status` |
| `orders.payment_method` | No existía | **ENUM** `payment_method` |
| `orders.subtotal` | No existía | DECIMAL (subtotal antes de envío/impuesto) |
| `orders.delivery_fee` | No existía | DECIMAL (DEFAULT 15.00) |
| `orders.tax` | No existía | DECIMAL (IVA 12%) |
| `order_items.unit_price` | `price` | `unit_price` DECIMAL |
| `order_items.subtotal` | No existía | `subtotal` = unit_price × quantity |
| `order_items.name` | Se duplicaba | Se elimina (se consulta al catálogo) |

---

## 6. Diagramas de Actividades / Secuencia Actualizados

### 6.1 Secuencia: Crear Orden con Publicación en Cola (NUEVO)

```mermaid
sequenceDiagram
    actor C as Cliente
    participant FE as Frontend
    participant GW as API Gateway
    participant OS as Order Service
    participant ODB as Order DB
    participant MQ as RabbitMQ
    participant RS as Restaurant Service

    C->>FE: Selecciona productos y confirma orden
    FE->>GW: POST /api/orders
    Note over GW: authMiddleware valida JWT
    GW->>OS: gRPC CreateOrder

    OS->>ODB: INSERT INTO orders + order_items
    ODB-->>OS: orden creada (id, status: CREADA)

    OS->>MQ: publish("new_orders", orderData)
    Note over MQ: Mensaje persistente en cola

    MQ-->>OS: ACK (mensaje encolado)

    OS-->>GW: {success: true, order, queue_status: "message_sent"}
    GW-->>FE: 201 Created
    FE-->>C: Confirmación de orden

    Note over MQ,RS: Consumo asíncrono
    MQ->>RS: consume("new_orders")
    RS->>RS: Registra/imprime orden en consola
    RS->>MQ: ACK (mensaje procesado)
```

### 6.2 Secuencia: Flujo Completo de Orden (Actualizado con Cola)

```mermaid
sequenceDiagram
    actor C as Cliente
    actor R as Restaurante
    actor D as Repartidor
    participant GW as API Gateway
    participant OS as Order Service
    participant MQ as RabbitMQ
    participant RS as Restaurant Service
    participant DS as Delivery Service
    participant NS as Notification Service

    Note over C,NS: 1. CREACIÓN DE ORDEN (con cola)
    C->>GW: POST /api/orders
    GW->>OS: gRPC CreateOrder
    OS->>OS: Persiste orden en DB
    OS->>MQ: publish("new_orders", orderData)
    MQ-->>RS: consume → registra nueva orden
    OS->>NS: gRPC SendOrderCreated ✉️
    OS-->>GW: orden CREADA
    GW-->>C: 201 OK

    Note over C,NS: 2. RESTAURANTE ACEPTA
    R->>GW: PUT /api/orders/:id/status {status: "EN_PROCESO"}
    GW->>OS: gRPC UpdateOrderStatus
    OS-->>GW: orden EN_PROCESO
    GW-->>R: 200 OK

    Note over C,NS: 3. RESTAURANTE FINALIZA
    R->>GW: PUT /api/orders/:id/status {status: "LISTA"}
    GW->>OS: gRPC UpdateOrderStatus
    OS-->>GW: orden LISTA
    GW-->>R: 200 OK

    Note over C,NS: 4. REPARTIDOR ACEPTA
    D->>GW: POST /api/delivery/accept {order_id}
    GW->>DS: gRPC AcceptOrder
    DS->>OS: gRPC UpdateOrderStatus → EN_CAMINO
    OS->>NS: gRPC SendOrderInRoute ✉️
    DS-->>GW: delivery creada
    GW-->>D: 200 OK

    Note over C,NS: 5. REPARTIDOR ENTREGA
    D->>GW: PUT /api/delivery/status {order_id, status: "ENTREGADA"}
    GW->>DS: gRPC UpdateDeliveryStatus
    DS->>OS: gRPC UpdateOrderStatus → ENTREGADA
    DS-->>GW: delivery actualizada
    GW-->>D: 200 OK
```

### 6.3 Diagrama de Actividad: Crear Orden con Cola

```mermaid
flowchart TD
    A([Cliente envía orden]) --> B{Datos válidos?}
    B -->|No| C[Retornar error 400]
    B -->|Sí| D[Calcular subtotal, tax, total]
    D --> E[INSERT INTO orders]
    E --> F[INSERT INTO order_items]
    F --> G{DB commit exitoso?}
    G -->|No| H[ROLLBACK + error 500]
    G -->|Sí| I[Publicar mensaje en RabbitMQ]
    I --> J{RabbitMQ disponible?}
    J -->|No| K[Log warning - orden ya guardada]
    J -->|Sí| L[Mensaje en cola 'new_orders']
    K --> M[Retornar 201 - orden creada]
    L --> M
    L --> N[Restaurant-Service consume mensaje]
    N --> O[Imprime orden en consola]
    O --> P[Envía ACK a RabbitMQ]

    style I fill:#ff9800,stroke:#e65100,color:#fff
    style L fill:#ff9800,stroke:#e65100,color:#fff
    style N fill:#ce93d8,stroke:#7b1fa2
    style O fill:#ce93d8,stroke:#7b1fa2
```

### 6.4 Diagrama de Actividad: Consumo de Mensajes

```mermaid
flowchart TD
    A([Restaurant-Service inicia]) --> B[Conectar a RabbitMQ]
    B --> C{Conexión exitosa?}
    C -->|No| D[Esperar 3s y reintentar]
    D --> B
    C -->|Sí| E[Suscribirse a cola 'new_orders']
    E --> F[Esperando mensajes...]
    F --> G{Mensaje recibido?}
    G -->|Sí| H[Parsear JSON del mensaje]
    H --> I{JSON válido?}
    I -->|No| J[NACK - descartar mensaje]
    I -->|Sí| K[Imprimir orden en consola]
    K --> L[Guardar en memoria]
    L --> M[ACK - confirmar procesamiento]
    J --> F
    M --> F

    style E fill:#ff9800,stroke:#e65100,color:#fff
    style K fill:#ce93d8,stroke:#7b1fa2
```

---

## 7. Guía de Despliegue en Kubernetes (Paso a Paso)

### 7.1 Prerrequisitos

- Cuenta de Google Cloud con billing habilitado
- `gcloud` CLI instalado y configurado
- `kubectl` instalado
- Docker instalado (para builds locales)

### 7.2 Paso 1: Crear el Clúster GKE

```bash
# Configurar proyecto
gcloud config set project usac-sa-201346084

# Crear clúster
gcloud container clusters create delivereats-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 5

# Obtener credenciales
gcloud container clusters get-credentials delivereats-cluster \
  --zone us-central1-a
```

### 7.3 Paso 2: Crear Namespace

```bash
kubectl create namespace delivereats
kubectl config set-context --current --namespace=delivereats
```

### 7.4 Paso 3: Crear Secrets

```bash
# Crear secrets para bases de datos y JWT
kubectl create secret generic delivereats-secrets \
  --namespace=delivereats \
  --from-literal=JWT_SECRET=delivereats_secret_key_sa_2026 \
  --from-literal=DB_PASSWORD=delivereats123 \
  --from-literal=RABBITMQ_PASSWORD=delivereats123 \
  --from-literal=SMTP_USER=jalbertochigua@gmail.com \
  --from-literal=SMTP_PASS=xyjd_snzf_dgsh_ptls
```

### 7.5 Paso 4: Crear ConfigMap

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: delivereats-config
  namespace: delivereats
data:
  NODE_ENV: "production"
  AUTH_SERVICE_HOST: "auth-svc:50051"
  RESTAURANT_SERVICE_HOST: "restaurant-svc:50052"
  ORDER_SERVICE_HOST: "order-svc:50053"
  DELIVERY_SERVICE_HOST: "delivery-svc:50054"
  NOTIFICATION_SERVICE_HOST: "notification-svc:50055"
  RABBITMQ_URL: "amqp://delivereats:delivereats123@rabbitmq-svc:5672"
  DB_PORT: "5432"
  DB_USER: "delivereats"
EOF
```

### 7.6 Paso 5: Build y Push de Imágenes

```bash
# Configurar Docker con GCR
gcloud auth configure-docker

# Build y push de cada servicio
SERVICES=("frontend" "api-gateway" "auth-service" "restaurant-catalog-service" "order-service" "delivery-service" "notification-service")

for svc in "${SERVICES[@]}"; do
  docker build -t gcr.io/usac-sa-201346084/$svc:v1.1.0 ./$svc/
  docker push gcr.io/usac-sa-201346084/$svc:v1.1.0
done
```

### 7.7 Paso 6: Desplegar Bases de Datos (StatefulSets)

```yaml
# Ejemplo: order-db StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: order-db
  namespace: delivereats
spec:
  serviceName: order-db-svc
  replicas: 1
  selector:
    matchLabels:
      app: order-db
  template:
    metadata:
      labels:
        app: order-db
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              value: "delivereats"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: delivereats-secrets
                  key: DB_PASSWORD
            - name: POSTGRES_DB
              value: "delivereats_orders"
          volumeMounts:
            - name: order-db-storage
              mountPath: /var/lib/postgresql/data
          livenessProbe:
            exec:
              command: ["pg_isready", "-U", "delivereats"]
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "delivereats"]
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: order-db-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: order-db-svc
  namespace: delivereats
spec:
  selector:
    app: order-db
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None
```

### 7.8 Paso 7: Desplegar RabbitMQ

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: delivereats
spec:
  serviceName: rabbitmq-svc
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
        - name: rabbitmq
          image: rabbitmq:3-management-alpine
          ports:
            - containerPort: 5672
            - containerPort: 15672
          env:
            - name: RABBITMQ_DEFAULT_USER
              value: "delivereats"
            - name: RABBITMQ_DEFAULT_PASS
              valueFrom:
                secretKeyRef:
                  name: delivereats-secrets
                  key: RABBITMQ_PASSWORD
          volumeMounts:
            - name: rabbitmq-storage
              mountPath: /var/lib/rabbitmq
          livenessProbe:
            exec:
              command: ["rabbitmq-diagnostics", "-q", "ping"]
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["rabbitmq-diagnostics", "-q", "ping"]
            initialDelaySeconds: 20
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: rabbitmq-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-svc
  namespace: delivereats
spec:
  selector:
    app: rabbitmq
  ports:
    - name: amqp
      port: 5672
      targetPort: 5672
    - name: management
      port: 15672
      targetPort: 15672
```

### 7.9 Paso 8: Desplegar Microservicios (Deployments)

```yaml
# Ejemplo: Order Service Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: delivereats
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: gcr.io/usac-sa-201346084/order-service:v1.1.0
          ports:
            - containerPort: 50053
          envFrom:
            - configMapRef:
                name: delivereats-config
          env:
            - name: DB_HOST
              value: "order-db-svc"
            - name: DB_NAME
              value: "delivereats_orders"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: delivereats-secrets
                  key: DB_PASSWORD
            - name: GRPC_PORT
              value: "50053"
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: order-svc
  namespace: delivereats
spec:
  selector:
    app: order-service
  ports:
    - port: 50053
      targetPort: 50053
```

### 7.10 Paso 9: Configurar Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: delivereats-ingress
  namespace: delivereats
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: delivereats.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-gateway-svc
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
```

### 7.11 Paso 10: Aplicar y Verificar

```bash
# Aplicar todos los manifiestos
kubectl apply -f k8s/ --namespace=delivereats

# Verificar pods
kubectl get pods -n delivereats

# Verificar services
kubectl get svc -n delivereats

# Verificar ingress
kubectl get ingress -n delivereats

# Ver logs de un servicio
kubectl logs -f deployment/order-service -n delivereats

# Verificar estado de la cola
kubectl port-forward svc/rabbitmq-svc 15672:15672 -n delivereats
# Luego acceder a http://localhost:15672
```

---

## 8. Estrategias de Rollout y Rollback

### 8.1 Estrategia de Rollout: RollingUpdate

Se utiliza **RollingUpdate** como estrategia de despliegue. Esto permite actualizar los Pods gradualmente sin downtime.

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Máximo 1 Pod extra durante actualización
      maxUnavailable: 0   # Siempre mantener todas las réplicas disponibles
```

**Comportamiento:**
1. K8s crea un Pod nuevo con la nueva versión
2. Espera a que pase el `readinessProbe`
3. Redirige tráfico al nuevo Pod
4. Elimina un Pod viejo
5. Repite hasta actualizar todos

### 8.2 Rollback

Si un despliegue falla (Pod no pasa health check), se ejecuta rollback:

```bash
# Ver historial de despliegues
kubectl rollout history deployment/order-service -n delivereats

# Rollback a la versión anterior
kubectl rollout undo deployment/order-service -n delivereats

# Rollback a una revisión específica
kubectl rollout undo deployment/order-service --to-revision=2 -n delivereats

# Verificar estado del rollout
kubectl rollout status deployment/order-service -n delivereats
```

### 8.3 Configuración de Probes para Rollout Seguro

```yaml
# Liveness: si falla, K8s reinicia el Pod
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3

# Readiness: si falla, K8s no envía tráfico al Pod
readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

### 8.4 Resumen de Estrategias

| Estrategia | Uso | Ventaja | Desventaja |
|------------|-----|---------|------------|
| **RollingUpdate** (elegida) | Producción | Zero downtime | Rollout más lento |
| Recreate | Desarrollo/Testing | Rápido | Downtime durante actualización |
| Blue/Green | Releases críticos | Rollback instantáneo | Requiere doble de recursos |
| Canary | Features experimentales | Riesgo controlado | Complejidad adicional |

---

## 9. Descripción del Pipeline CI/CD

### 9.1 Herramientas

| Componente | Herramienta |
|-----------|-------------|
| Código fuente | GitHub |
| CI/CD | GitHub Actions |
| Registro de imágenes | GitHub Container Registry (ghcr.io) |
| Orquestación | Google Kubernetes Engine (GKE) |
| Secrets en CI | GitHub Secrets |

### 9.2 Flujo del Pipeline

```mermaid
flowchart LR
    A[Push / PR a main] --> B[CI: Lint + Test]
    B --> C{Tests pasan?}
    C -->|No| D[Notificar fallo]
    C -->|Sí| E[Build Docker Images]
    E --> F[Push a ghcr.io]
    F --> G[CD: Deploy a GKE]
    G --> H[kubectl apply]
    H --> I[Verify rollout]
    I --> J{Healthy?}
    J -->|No| K[Auto-rollback]
    J -->|Sí| L[Deploy exitoso ✅]
```

### 9.3 GitHub Actions Workflow

```yaml
name: CI/CD Delivereats

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  GKE_CLUSTER: delivereats-cluster
  GKE_ZONE: us-central1-a
  GCP_PROJECT: usac-sa-201346084

jobs:
  # ===== CI =====
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies & test
        run: |
          for svc in auth-service restaurant-catalog-service order-service delivery-service api-gateway; do
            cd $svc && npm ci && npm test && cd ..
          done

  # ===== BUILD & PUSH =====
  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        service: [frontend, api-gateway, auth-service, restaurant-catalog-service, order-service, delivery-service, notification-service]
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & Push
        uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.service }}
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/${{ matrix.service }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}/${{ matrix.service }}:latest

  # ===== DEPLOY =====
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Auth to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup GKE credentials
        uses: google-github-actions/get-gke-credentials@v2
        with:
          cluster_name: ${{ env.GKE_CLUSTER }}
          location: ${{ env.GKE_ZONE }}

      - name: Deploy to GKE
        run: |
          kubectl set image deployment/order-service \
            order-service=ghcr.io/${{ github.repository }}/order-service:${{ github.sha }} \
            -n delivereats
          kubectl rollout status deployment/order-service -n delivereats --timeout=120s
```

### 9.4 Variables y Secrets necesarios

#### GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `GCP_SA_KEY` | JSON de la Service Account de GCP | `{"type": "service_account", ...}` |
| `JWT_SECRET` | Secret para firmar tokens JWT | `delivereats_secret_key_sa_2026` |
| `DB_PASSWORD` | Contraseña de las bases de datos | `delivereats123` |
| `RABBITMQ_PASSWORD` | Contraseña de RabbitMQ | `delivereats123` |
| `SMTP_USER` | Email para notificaciones | `jalbertochigua@gmail.com` |
| `SMTP_PASS` | App password de Gmail | `xyjd snzf dgsh ptls` |

#### Variables de Entorno (no sensibles)

| Variable | Valor |
|----------|-------|
| `GKE_CLUSTER` | `delivereats-cluster` |
| `GKE_ZONE` | `us-central1-a` |
| `GCP_PROJECT` | `usac-sa-201346084` |
| `NODE_ENV` | `production` |

---

## 10. Descripción del Flujo JWT

### 10.1 Ciclo de Vida del Token

```mermaid
sequenceDiagram
    actor U as Usuario
    participant FE as Frontend
    participant GW as API Gateway
    participant AS as Auth Service

    Note over U,AS: 1. OBTENER TOKEN
    U->>FE: Login (email + password)
    FE->>GW: POST /api/auth/login
    GW->>AS: gRPC Login(email, password)
    AS->>AS: Verifica bcrypt(password, hash)
    AS->>AS: jwt.sign({id, email, role, name}, SECRET, {expiresIn: '24h'})
    AS-->>GW: {token: "eyJhbG...", user: {...}}
    GW-->>FE: 200 OK + token
    FE->>FE: localStorage.setItem('token', token)

    Note over U,AS: 2. USAR TOKEN EN PETICIONES
    U->>FE: Acción protegida (ej: crear orden)
    FE->>GW: POST /api/orders<br/>Authorization: Bearer eyJhbG...
    GW->>GW: Extrae token del header
    GW->>AS: gRPC ValidateToken(token)
    AS->>AS: jwt.verify(token, SECRET)
    alt Token válido
        AS-->>GW: {valid: true, user_id: 1, role: "CLIENTE", ...}
        GW->>GW: req.user = decoded payload
        GW->>GW: authorizeRoles('CLIENTE') → OK
        GW->>GW: Procesa petición normalmente
    else Token inválido/expirado
        AS-->>GW: {valid: false}
        GW-->>FE: 401 Unauthorized
        FE->>FE: Redirige a /login
    end
```

### 10.2 Estructura del Token JWT

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
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

**Firma:**
```
HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), JWT_SECRET)
```

### 10.3 Ejemplo de Peticiones

#### Login (obtener token)

```bash
# Request
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jose@test.com",
    "password": "123456"
  }'

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJqb3NlQHRlc3QuY29tIiwicm9sZSI6IkNMSUVOVEUiLCJuYW1lIjoiSm9zw6kgQWxiZXJ0byIsImlhdCI6MTc0MDQ1MTIwMCwiZXhwIjoxNzQwNTM3NjAwfQ.abc123",
  "user": {
    "id": 1,
    "email": "jose@test.com",
    "role": "CLIENTE",
    "name": "José Alberto"
  }
}
```

#### Petición protegida (con token)

```bash
# Request - Crear orden (requiere rol CLIENTE)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "restaurant_id": 1,
    "items": [{"menu_item_id": 1, "quantity": 2, "unit_price": 45.00}],
    "delivery_address": "Ciudad Universitaria USAC"
  }'

# Response 201 (token válido + rol correcto)
{
  "success": true,
  "message": "Orden #1 creada exitosamente"
}
```

#### Petición sin token o token inválido

```bash
# Sin token
curl -X GET http://localhost:3000/api/restaurants
# → 401 {"message": "Token no proporcionado"}

# Token expirado
curl -X GET http://localhost:3000/api/restaurants \
  -H "Authorization: Bearer token_expirado"
# → 401 {"message": "Token inválido o expirado"}

# Rol incorrecto (CLIENTE intenta crear restaurante)
curl -X POST http://localhost:3000/api/restaurants \
  -H "Authorization: Bearer token_de_cliente"
  -d '{"name": "Mi Restaurante"}'
# → 403 {"message": "No tienes permisos para esta acción"}
```

### 10.4 Matriz de Autorización por Rol

| Endpoint | CLIENTE | RESTAURANTE | REPARTIDOR | ADMIN |
|----------|---------|-------------|------------|-------|
| POST /auth/register | ✅ Público | ✅ Público | ✅ Público | ✅ Público |
| POST /auth/login | ✅ Público | ✅ Público | ✅ Público | ✅ Público |
| GET /restaurants | ✅ | ✅ | ✅ | ✅ |
| POST /restaurants | ❌ | ❌ | ❌ | ✅ |
| POST /orders | ✅ | ❌ | ❌ | ❌ |
| GET /orders/my | ✅ | ❌ | ❌ | ❌ |
| GET /orders/restaurant/:id | ❌ | ✅ | ❌ | ❌ |
| PUT /orders/:id/status | ❌ | ✅ | ❌ | ❌ |
| POST /delivery/accept | ❌ | ❌ | ✅ | ❌ |
| GET /orders/all | ❌ | ❌ | ❌ | ✅ |

---

## 11. Prueba de Concepto — RabbitMQ

### 11.1 Descripción

Se implementó un PoC funcional de comunicación asíncrona usando **RabbitMQ** entre dos microservicios:

| Rol | Servicio | Acción |
|-----|----------|--------|
| **Productor** | Order-Service | Publica mensaje JSON en la cola `new_orders` al crear una orden |
| **Consumidor** | Restaurant-Service | Consume mensajes de la cola y los imprime en consola |

### 11.2 Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Broker | RabbitMQ 3 Management Alpine |
| Protocolo | AMQP 0-9-1 |
| Librería | amqplib (Node.js) |
| Cola | `new_orders` (durable) |
| Mensajes | JSON persistente |

### 11.3 Estructura del Mensaje

```json
{
  "order_id": 1,
  "customer_id": 1,
  "customer_name": "José Alberto",
  "customer_email": "jose@test.com",
  "restaurant_id": 1,
  "restaurant_name": "Pizza Planet",
  "items": [
    {"menu_item_id": 1, "name": "Pizza Margherita", "quantity": 2, "price": 45.00},
    {"menu_item_id": 2, "name": "Coca-Cola 600ml", "quantity": 2, "price": 12.00}
  ],
  "total": 142.68,
  "delivery_address": "Ciudad Universitaria USAC, Zona 12",
  "status": "CREADA",
  "created_at": "2026-02-26T03:38:12.033Z"
}
```

### 11.4 Cómo Ejecutar

```bash
cd PRACTICA4
docker compose up --build

# En otra terminal:
./test.sh

# Ver logs del consumidor:
docker compose logs restaurant-service
```

### 11.5 Resultado

**Productor (Order-Service):**
```
✅ [Order-Service] Orden #1 creada en DB
📤 [Order-Service] Mensaje publicado en cola "new_orders":
   Order ID:     1
   Restaurante:  1
   Cliente:      1
   Items:        2
   Total:        Q142.68
📨 [Order-Service] Mensaje enviado a Restaurant-Service vía RabbitMQ
```

**Consumidor (Restaurant-Service):**
```
📥 [Restaurant-Service] NUEVA ORDEN RECIBIDA DE LA COLA
   🆔 Order ID:      1
   👤 Cliente:        José Alberto (ID: 1)
   🏪 Restaurante:    Pizza Planet (ID: 1)
   💰 Total:          Q142.68
   📋 Items:
      1. Pizza Margherita x2 - Q45
      2. Coca-Cola 600ml x2 - Q12
✅ [Restaurant-Service] Orden #1 procesada y confirmada (ACK)
```
