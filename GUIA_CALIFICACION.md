# 🎯 GUÍA DE CALIFICACIÓN — Delivereats Fase 1

**Estudiante:** José Alberto Alarcón Chigua  
**Carné:** 201346084  
**Repo:** https://github.com/iamjalberto/SA_PROYECTO_201346084  
**Tag:** `v1.0.0`

---

## 📌 URLs de Producción (GCP)

| Servicio | URL |
|----------|-----|
| 🌐 Frontend | http://34.57.204.245:5173 |
| 🔌 API Gateway | http://34.57.204.245:3000/api |
| ❤️ Health Check | http://34.57.204.245:3000/api/health |

---

## 🔑 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| CLIENTE | `iam@jalber.to` | `Test123456` |
| RESTAURANTE | `rest_owner@test.com` | `Rest123456` |
| REPARTIDOR | `rep_test@test.com` | `Rep123456` |
| ADMINISTRADOR | `admin_smtp@test.com` | `Admin123456` |

---

## �️ Conexión a Bases de Datos (DBeaver)

> Cada microservicio tiene PostgreSQL **embebido** en su contenedor. Los puertos están expuestos **solo dentro de Docker** (`localhost:5432` dentro de cada contenedor). Para conectar desde DBeaver, usa la **IP de GCP** con los puertos del contenedor.

### Desde la VM de GCP (dentro de Docker)

Cada BD es accesible con `docker compose exec`:

```bash
# Auth DB
docker compose exec auth-service psql -U postgres -d auth_db

# Restaurant DB
docker compose exec restaurant-catalog-service psql -U postgres -d restaurant_db

# Order DB
docker compose exec order-service psql -U postgres -d order_db

# Delivery DB
docker compose exec delivery-service psql -U postgres -d delivery_db
```

### Queries útiles dentro de cada BD

```sql
-- Auth DB: Ver usuarios
SELECT id, email, name, role, created_at FROM users ORDER BY id;

-- Restaurant DB: Ver restaurantes y menú
SELECT * FROM restaurants;
SELECT * FROM menu_items;

-- Order DB: Ver órdenes y sus items
SELECT id, client_name, restaurant_name, total, status, created_at FROM orders ORDER BY id;
SELECT * FROM order_items;

-- Delivery DB: Ver entregas
SELECT * FROM deliveries;
```

### Credenciales de cada Base de Datos

| Servicio | Host (dentro del contenedor) | Puerto | Usuario | Contraseña | Base de Datos |
|----------|------------------------------|--------|---------|------------|---------------|
| Auth Service | `localhost` | `5432` | `postgres` | `postgres` | `auth_db` |
| Restaurant Catalog | `localhost` | `5432` | `postgres` | `postgres` | `restaurant_db` |
| Order Service | `localhost` | `5432` | `postgres` | `postgres` | `order_db` |
| Delivery Service | `localhost` | `5432` | `postgres` | `postgres` | `delivery_db` |

### Conexión desde DBeaver (local) via SSH Tunnel

> Como las BDs no exponen puertos al exterior, se conecta vía túnel SSH a la VM de GCP.

**Configuración por cada BD en DBeaver:**

| Campo | Auth DB | Restaurant DB | Order DB | Delivery DB |
|-------|---------|---------------|----------|-------------|
| **Connection Type** | PostgreSQL | PostgreSQL | PostgreSQL | PostgreSQL |
| **Host** | `localhost` | `localhost` | `localhost` | `localhost` |
| **Port** | `5432` | `5432` | `5432` | `5432` |
| **Database** | `auth_db` | `restaurant_db` | `order_db` | `delivery_db` |
| **Username** | `postgres` | `postgres` | `postgres` | `postgres` |
| **Password** | `postgres` | `postgres` | `postgres` | `postgres` |

**Pestaña SSH Tunnel en DBeaver:**

| Campo | Valor |
|-------|-------|
| Use SSH Tunnel | ✅ Sí |
| Host | `34.57.204.245` |
| Port | `22` |
| Username | `jose` |
| Authentication | Google Cloud SSH Key (o Private Key) |

**Alternativa rápida: abrir túneles SSH manuales:**
```bash
# Túnel para auth_db (local 15432 → contenedor auth-service:5432)
gcloud compute ssh delivereats-vm --zone=us-central1-a -- -L 15432:localhost:50051 -N &

# O conectar directo por port-forward del contenedor:
gcloud compute ssh delivereats-vm --zone=us-central1-a --command="sudo docker compose exec -T auth-service psql -U postgres -d auth_db -c 'SELECT * FROM users;'"
gcloud compute ssh delivereats-vm --zone=us-central1-a --command="sudo docker compose exec -T restaurant-catalog-service psql -U postgres -d restaurant_db -c 'SELECT * FROM restaurants; SELECT * FROM menu_items;'"
gcloud compute ssh delivereats-vm --zone=us-central1-a --command="sudo docker compose exec -T order-service psql -U postgres -d order_db -c 'SELECT id, client_name, restaurant_name, total, status FROM orders;'"
gcloud compute ssh delivereats-vm --zone=us-central1-a --command="sudo docker compose exec -T delivery-service psql -U postgres -d delivery_db -c 'SELECT * FROM deliveries;'"
```

---

## �🐳 Comandos Docker

### Levantar TODO
```bash
# Desde la raíz del proyecto
docker compose up --build -d

# Verificar que los 7 contenedores estén corriendo
docker compose ps
```

### Detener TODO
```bash
docker compose down
```

### Reconstruir y reiniciar un servicio individual
```bash
# Auth Service
docker compose up -d --build auth-service

# Restaurant Catalog Service
docker compose up -d --build restaurant-catalog-service

# Order Service
docker compose up -d --build order-service

# Delivery Service
docker compose up -d --build delivery-service

# Notification Service
docker compose up -d --build notification-service

# API Gateway
docker compose up -d --build api-gateway

# Frontend
docker compose up -d --build frontend
```

### Ver logs de un servicio
```bash
docker compose logs -f auth-service
docker compose logs -f notification-service
docker compose logs -f api-gateway
docker compose logs -f order-service
```

### Verificar Health
```bash
curl http://localhost:3000/api/health
# {"status":"OK","service":"API Gateway - Delivereats"}
```

---

## ✅ RÚBRICA — Comandos por cada punto

> **BASE URL:** `http://34.57.204.245:3000/api` (GCP) o `http://localhost:3000/api` (local)

```bash
BASE="http://34.57.204.245:3000/api"
```

---

### 🖥️ FRONTEND (20 pts)

| Criterio | Valor | Cómo demostrar |
|----------|-------|----------------|
| Consumo de servicios desde el frontend | 10 | Abrir http://34.57.204.245:5173 — toda la app consume REST |
| UI coherente | 2.5 | Navegar por las 4 vistas de roles, diseño uniforme |
| UX amigable | 2.5 | Validaciones en formularios, toast notifications, badges de estado |
| Respuesta y navegación rápida | 5 | SPA con React Router, sin recarga de página |

**Demostración en el frontend:**
1. Ir a http://34.57.204.245:5173
2. Login con cada rol y mostrar su dashboard
3. Mostrar validaciones (intentar submit con campos vacíos)
4. Mostrar navegación entre páginas sin recarga

---

### ⚙️ FUNCIONALIDADES (40 pts)

#### 🔐 Uso de JWT para sesiones (3 pts)

```bash
# Login → devuelve JWT
curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"iam@jalber.to","password":"Test123456"}'

# Guardar token para usar después
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"iam@jalber.to","password":"Test123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Request sin token → 401
curl -s $BASE/restaurants
# {"message":"Token requerido"}

# Request con token → 200
curl -s $BASE/restaurants -H "Authorization: Bearer $TOKEN"
```

#### 👤 Registro de Cliente (1.5 pts)
```bash
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo_cliente@test.com","password":"Pass123456","name":"Nuevo Cliente","role":"CLIENTE"}'
# {"success":true,"message":"Usuario registrado exitosamente","user_id":...}
```

#### 🏪 Registro de Restaurante (1.5 pts)
```bash
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo_rest@test.com","password":"Pass123456","name":"Nuevo Restaurante","role":"RESTAURANTE"}'
```

#### 🚴 Registro de Repartidor (1.5 pts)
```bash
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo_rep@test.com","password":"Pass123456","name":"Nuevo Repartidor","role":"REPARTIDOR"}'
```

#### 🛒 Creación de orden (1 pt)
```bash
# Login como CLIENTE
CLI_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"iam@jalber.to","password":"Test123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Crear orden
curl -s -X POST $BASE/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLI_TOKEN" \
  -d '{
    "restaurant_id": 1,
    "restaurant_name": "Pizza Test Updated",
    "delivery_address": "5ta Avenida 12-34, Zona 1, Guatemala",
    "items": [{"menu_item_id":1,"name":"Pizza Margarita","quantity":2,"price":75}]
  }'
```

#### ➕ Creación de productos nuevos (1.5 pts)
```bash
# Login como RESTAURANTE
REST_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rest_owner@test.com","password":"Rest123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Crear producto
curl -s -X POST $BASE/restaurants/1/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"name":"Lasagna Bolognese","description":"Lasagna con carne","price":85,"available":true,"category":"Pastas"}'
```

#### ✏️ Actualizar productos (1 pt)
```bash
curl -s -X PUT $BASE/restaurants/menu/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"name":"Pizza Margarita XL","description":"Pizza grande","price":95,"available":true,"category":"Pizzas"}'
```

#### 🗑️ Eliminar producto (1 pt)
```bash
# Primero crear uno temporal para eliminar
curl -s -X POST $BASE/restaurants/1/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"name":"Temporal","description":"Para borrar","price":10,"available":true,"category":"Test"}'

# Eliminar (usar el ID devuelto)
curl -s -X DELETE $BASE/restaurants/menu/ITEM_ID \
  -H "Authorization: Bearer $REST_TOKEN"
```

#### 📋 Actualización de estado de orden — Cliente (1 pt)
```bash
# Ver mis órdenes como cliente
curl -s $BASE/orders/my -H "Authorization: Bearer $CLI_TOKEN"
```

#### 📋 Actualización de estado de orden — Restaurante (2 pts)
```bash
# Ver órdenes del restaurante
curl -s $BASE/orders/restaurant/1 -H "Authorization: Bearer $REST_TOKEN"

# Aceptar orden (CREADA → EN_PROCESO)
curl -s -X PUT $BASE/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"status":"EN_PROCESO"}'

# Marcar como lista (EN_PROCESO → LISTA)
curl -s -X PUT $BASE/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"status":"LISTA"}'
```

#### 📋 Actualizar estado de orden — Repartidor (1 pt)
```bash
# Login como REPARTIDOR
REP_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rep_test@test.com","password":"Rep123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Aceptar pedido listo
curl -s -X POST $BASE/delivery/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REP_TOKEN" \
  -d '{"order_id": ORDER_ID}'

# Marcar como entregada
curl -s -X PUT $BASE/delivery/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REP_TOKEN" \
  -d '{"order_id": ORDER_ID, "status":"ENTREGADA"}'
```

#### 📑 Listado de órdenes por restaurante (1 pt)
```bash
curl -s $BASE/orders/restaurant/1 \
  -H "Authorization: Bearer $REST_TOKEN"
```

#### ❌ Cancelar Orden — Cliente (1 pt)
```bash
curl -s -X PUT $BASE/orders/ORDER_ID/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLI_TOKEN" \
  -d '{"reason":"Ya no quiero la orden"}'
```

#### ❌ Cancelar Orden — Restaurante (1 pt)
```bash
curl -s -X PUT $BASE/orders/ORDER_ID/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"reason":"Sin ingredientes disponibles"}'
```

#### ❌ Cancelar Orden — Repartidor (1 pt)
```bash
curl -s -X PUT $BASE/delivery/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REP_TOKEN" \
  -d '{"order_id": ORDER_ID, "status":"CANCELADA", "reason":"Problema con el vehículo"}'
```

---

### 📧 NOTIFICACIONES (20 pts)

> Los emails se envían a la dirección del CLIENTE que creó la orden.
> SMTP configurado con: `jalbertochigua@gmail.com`

#### ✉️ Notificación de orden creada (4 pts)
```bash
# Se envía automáticamente al crear una orden (POST /orders)
# Ver logs:
docker compose logs notification-service --tail 10
```

#### ✉️ Notificación de orden cancelada por Cliente (4 pts)
```bash
# Se envía automáticamente al cancelar (PUT /orders/:id/cancel con token CLIENTE)
```

#### ✉️ Notificación de orden en camino (4 pts)
```bash
# Se envía automáticamente cuando el repartidor acepta (POST /delivery/accept)
```

#### ✉️ Notificación de orden cancelada por Restaurante (4 pts)
```bash
# Se envía al cancelar con token RESTAURANTE (PUT /orders/:id/cancel)
# También se envía al rechazar (PUT /orders/:id/reject)
```

#### ✉️ Notificación de orden cancelada por Repartidor (4 pts)
```bash
# Se envía cuando repartidor cancela (PUT /delivery/status con status=CANCELADA)
```

#### Verificar logs de emails enviados
```bash
docker compose logs notification-service
# [Notification-Service] Email sent to iam@jalber.to: Pedido #X Creado - Delivereats
# [Notification-Service] Email sent to iam@jalber.to: Pedido #X Cancelado - Delivereats
# [Notification-Service] Email sent to iam@jalber.to: Pedido #X En Camino - Delivereats
```

---

### 🏗️ ARQUITECTURA E INFRAESTRUCTURA (30 pts)

#### Implementación de microservicios (6 pts)
```bash
# Mostrar los 7 contenedores corriendo (6 microservicios + frontend)
docker compose ps

# Servicios:
# 1. auth-service         (puerto 50051)
# 2. restaurant-catalog   (puerto 50052)
# 3. order-service        (puerto 50053)
# 4. delivery-service     (puerto 50054)
# 5. notification-service (puerto 50055)
# 6. api-gateway          (puerto 3000)
# 7. frontend             (puerto 5173)
```

#### Imágenes Docker funcionales y optimizadas (6 pts)
```bash
# Mostrar imágenes y sus tamaños
docker images | grep delivereats

# Mostrar que usa alpine (imágenes ligeras)
docker inspect delivereats-auth-service | grep -i "image"

# Frontend usa multi-stage (nginx:alpine ~25MB)
docker inspect delivereats-frontend | grep -i "image"
```

#### Uso de GCP para despliegue (6 pts)
```bash
# La app está corriendo en GCP Compute Engine
# VM: delivereats-vm | Zona: us-central1-a | IP: 34.57.204.245
# Verificar:
curl http://34.57.204.245:3000/api/health
curl http://34.57.204.245:5173 | head -3
```

#### Conexión correcta de componentes (6 pts)
```bash
# 4 bases de datos independientes (PostgreSQL embebida por servicio)
docker compose exec auth-service psql -U postgres -d auth_db -c "\dt"
docker compose exec restaurant-catalog-service psql -U postgres -d restaurant_db -c "\dt"
docker compose exec order-service psql -U postgres -d order_db -c "\dt"
docker compose exec delivery-service psql -U postgres -d delivery_db -c "\dt"

# Frontend → API Gateway → Microservicios
# Verificar con un request completo
curl -s $BASE/health
```

#### Uso de API Gateway (6 pts)
```bash
# Todas las rutas pasan por el gateway en puerto 3000
# Mostrar rutas disponibles:
# /api/auth/*          → auth-service:50051
# /api/restaurants/*   → restaurant-catalog-service:50052
# /api/orders/*        → order-service:50053
# /api/delivery/*      → delivery-service:50054

# JWT se valida en el gateway (middleware.js)
# Roles se validan en el gateway (authorizeRoles)

# Sin token:
curl -s $BASE/restaurants
# {"message":"Token requerido"}

# Con token inválido:
curl -s $BASE/restaurants -H "Authorization: Bearer token_falso"
# {"message":"Token inválido"}
```

#### Uso de gRPC para comunicación (6 pts)
```bash
# Mostrar archivos .proto
ls proto/

# Mostrar contenido de un proto
cat proto/auth.proto
cat proto/order.proto

# Mostrar que el gateway usa gRPC clients
cat api-gateway/src/grpcClients.js

# Comunicación inter-servicio: delivery-service llama a order-service via gRPC
cat delivery-service/src/handlers.js | grep -A5 "orderClient"
```

---

## 🔄 FLUJO COMPLETO DE DEMOSTRACIÓN (paso a paso)

### Preparar tokens
```bash
BASE="http://34.57.204.245:3000/api"

CLI_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"iam@jalber.to","password":"Test123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

REST_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rest_owner@test.com","password":"Rest123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

REP_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rep_test@test.com","password":"Rep123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

ADMIN_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin_smtp@test.com","password":"Admin123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Tokens OK"
```

### Paso 1: Cliente crea orden → email "Orden Creada"
```bash
curl -s -X POST $BASE/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLI_TOKEN" \
  -d '{
    "restaurant_id": 1,
    "restaurant_name": "Pizza Test Updated",
    "delivery_address": "5ta Avenida 12-34, Zona 1, Guatemala",
    "items": [{"menu_item_id":1,"name":"Pizza Margarita","quantity":2,"price":75}]
  }'
# ✉️ Email: "Pedido #N Creado"
# Guardar el ORDER_ID del response
```

### Paso 2: Restaurante acepta orden
```bash
curl -s -X PUT $BASE/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"status":"EN_PROCESO"}'
```

### Paso 3: Restaurante marca como lista
```bash
curl -s -X PUT $BASE/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"status":"LISTA"}'
```

### Paso 4: Repartidor acepta → email "En Camino"
```bash
curl -s -X POST $BASE/delivery/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REP_TOKEN" \
  -d '{"order_id": ORDER_ID}'
# ✉️ Email: "Pedido #N En Camino"
```

### Paso 5: Repartidor entrega
```bash
curl -s -X PUT $BASE/delivery/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REP_TOKEN" \
  -d '{"order_id": ORDER_ID, "status":"ENTREGADA"}'
```

### Flujo alternativo: Cancelar como Cliente → email
```bash
# Crear orden nueva
curl -s -X POST $BASE/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLI_TOKEN" \
  -d '{
    "restaurant_id": 1,
    "restaurant_name": "Pizza Test Updated",
    "delivery_address": "5ta Avenida 12-34, Zona 1, Guatemala",
    "items": [{"menu_item_id":1,"name":"Pizza Margarita","quantity":1,"price":75}]
  }'

# Cancelar
curl -s -X PUT $BASE/orders/ORDER_ID/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLI_TOKEN" \
  -d '{"reason":"Cambié de opinión"}'
# ✉️ Email: "Pedido #N Cancelado"
```

### Flujo alternativo: Rechazar como Restaurante → email
```bash
# Crear orden nueva, luego rechazar
curl -s -X PUT $BASE/orders/ORDER_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"reason":"Sin stock disponible"}'
# ✉️ Email: "Pedido #N Rechazado"
```

### Flujo alternativo: Cancelar como Repartidor → email
```bash
# (La orden debe estar en estado LISTA, repartidor la acepta y luego cancela)
curl -s -X PUT $BASE/delivery/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REP_TOKEN" \
  -d '{"order_id": ORDER_ID, "status":"CANCELADA", "reason":"Problema con el vehículo"}'
# ✉️ Email: "Pedido #N Cancelado por Repartidor"
```

---

## 📊 Máquina de Estados de una Orden

```
CREADA → EN_PROCESO → LISTA → EN_CAMINO → ENTREGADA
  ↓          ↓          ↓         ↓
CANCELADA  CANCELADA  CANCELADA  CANCELADA
  ↓
RECHAZADA (solo restaurante)
```

---

## 🗂️ Información de GCP

| Recurso | Detalle |
|---------|---------|
| Proyecto | `usac-sa-201346084` |
| VM | `delivereats-vm` |
| Zona | `us-central1-a` |
| Tipo | `e2-medium` (2 vCPU, 4 GB RAM) |
| SO | Ubuntu 22.04 LTS |
| IP | `34.57.204.245` |

### Comandos GCP
```bash
# SSH a la VM
gcloud compute ssh delivereats-vm --zone=us-central1-a

# Ver contenedores en la VM
gcloud compute ssh delivereats-vm --zone=us-central1-a --command="sudo docker compose -f /home/jose/delivereats/docker-compose.yml ps"

# Ver logs de un servicio en la VM
gcloud compute ssh delivereats-vm --zone=us-central1-a --command="sudo docker logs delivereats-notification-service-1 --tail 20"

# Reiniciar todo en la VM
gcloud compute ssh delivereats-vm --zone=us-central1-a --command="cd /home/jose/delivereats && sudo docker compose down && sudo docker compose up -d"
```
