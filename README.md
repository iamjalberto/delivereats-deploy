# 🍔 Delivereats - Plataforma de Delivery de Alimentos

**Proyecto Fase 1 - Software Avanzado A**  
**Universidad de San Carlos de Guatemala**  
**Facultad de Ingeniería - Escuela de Ciencias y Sistemas**

| Dato | Valor |
|------|-------|
| **Nombre** | José Alberto Alarcón Chigua |
| **Carné** | 201346084 |
| **Curso** | Software Avanzado A |
| **Catedráticos** | Everest Darwin Medinilla Rodríguez / Juan Pablo Samayoa Ruiz |

---

## 📋 Descripción del Proyecto

Delivereats es una plataforma de entrega de alimentos tipo delivery diseñada bajo una **arquitectura de microservicios**. La aplicación permite a los usuarios registrarse, iniciar sesión, explorar restaurantes, consultar menús, generar pedidos y gestionar entregas.

## 🏗️ Arquitectura

La aplicación está compuesta por **6 microservicios** independientes, cada uno con su propia base de datos:

```
┌─────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   API Gateway    │ (REST - Puerto 3000)
│  (React/Vite)│     │   (Express.js)   │
│  Puerto 5173 │     └──────┬───────────┘
└─────────────┘            │ gRPC
                ┌──────────┼──────────────┐
                │          │              │
         ┌──────▼──┐ ┌────▼─────┐ ┌──────▼──────────┐
         │  Auth   │ │Restaurant│ │   Order Service  │
         │ Service │ │ Catalog  │ │   Puerto 50053   │
         │  50051  │ │  Service │ └────────┬─────────┘
         └────┬────┘ │  50052   │          │
              │      └────┬────┘    ┌──────▼──────┐
         ┌────▼──┐   ┌────▼──┐     │  Delivery   │
         │Auth DB│   │Rest DB│     │  Service    │
         │ PG    │   │ PG    │     │   50054     │
         └───────┘   └───────┘     └──────┬──────┘
                                          │
                                   ┌──────▼──┐
                                   │Deliv DB │
                                   │ PG      │
                                   └─────────┘
                          ┌──────────────────┐
                          │   Notification   │
                          │    Service       │
                          │     50055        │
                          └──────────────────┘
```

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|-----------|------------|
| **Frontend** | React 18 + Vite |
| **API Gateway** | Node.js + Express |
| **Microservicios** | Node.js + gRPC |
| **Base de Datos** | PostgreSQL 15 (independiente por servicio) |
| **Autenticación** | JWT (JSON Web Tokens) |
| **Comunicación** | REST (frontend ↔ gateway) + gRPC (gateway ↔ servicios) |
| **Contenedores** | Docker + Docker Compose |
| **Nube** | Google Cloud Platform (GCP) |
| **Email** | Nodemailer (SMTP) |

## 📦 Microservicios

### 1. API Gateway (Puerto 3000)
- Expone rutas REST al frontend
- Valida JWT en cada request
- Autorización por roles (CLIENTE, RESTAURANTE, REPARTIDOR, ADMINISTRADOR)
- Enruta peticiones a microservicios vía gRPC

### 2. Auth Service (Puerto 50051)
- Registro de usuarios (CLIENTE, RESTAURANTE, REPARTIDOR, ADMINISTRADOR)
- Login con email y contraseña
- Generación de JWT
- Validación de tokens
- Encriptación de contraseñas con bcrypt

### 3. Restaurant Catalog Service (Puerto 50052)
- CRUD de restaurantes (ADMINISTRADOR)
- CRUD de items de menú (RESTAURANTE)
- Listado de restaurantes disponibles (CLIENTE)
- Listado de menú por restaurante (CLIENTE)

### 4. Order Service (Puerto 50053)
- Creación de órdenes (CLIENTE)
- Listado de órdenes por cliente y restaurante
- Actualización de estados: CREADA → EN_PROCESO → LISTA → EN_CAMINO → ENTREGADA
- Cancelación de órdenes (CLIENTE, RESTAURANTE, REPARTIDOR)
- Rechazo de órdenes (RESTAURANTE)

### 5. Delivery Service (Puerto 50054)
- Aceptar pedidos listos (REPARTIDOR)
- Actualizar estado de entrega (EN_CAMINO, ENTREGADA, CANCELADA)
- Listado de órdenes disponibles para entrega
- Historial de entregas por repartidor

### 6. Notification Service (Puerto 50055)
- Notificación por email de orden creada
- Notificación de orden cancelada (por cliente)
- Notificación de orden en camino
- Notificación de orden cancelada (por restaurante)
- Notificación de orden cancelada (por repartidor)
- Notificación de orden rechazada

## 🗄️ Bases de Datos

Cada microservicio tiene su propia base de datos PostgreSQL (independiente):

| Servicio | Base de Datos | Puerto Local |
|----------|--------------|-------------|
| Auth Service | auth_db | 5441 |
| Restaurant Catalog | restaurant_db | 5442 |
| Order Service | order_db | 5443 |
| Delivery Service | delivery_db | 5444 |

## 🚀 Cómo Ejecutar

### Requisitos
- Docker y Docker Compose instalados
- Git

### Ejecución Local con Docker Compose

```bash
# Clonar el repositorio
git clone https://github.com/iamjalberto/SA_PROYECTO_201346084.git
cd SA_PROYECTO_201346084

# Levantar todos los servicios
docker-compose up --build

# O en segundo plano
docker-compose up --build -d
```

### Acceso
- **Frontend:** http://localhost:5173
- **API Gateway:** http://localhost:3000/api/health

### Variables de Entorno para Email (Opcional)
```bash
export SMTP_USER=tu_email@gmail.com
export SMTP_PASS=tu_app_password
docker-compose up --build
```

## 📡 API Endpoints

### Auth
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/auth/register` | Registro de usuario | Público |
| POST | `/api/auth/login` | Inicio de sesión | Público |

### Restaurantes
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/restaurants` | Listar restaurantes | Autenticado |
| GET | `/api/restaurants/:id` | Detalle de restaurante | Autenticado |
| POST | `/api/restaurants` | Crear restaurante | ADMINISTRADOR |
| PUT | `/api/restaurants/:id` | Actualizar restaurante | ADMINISTRADOR |
| DELETE | `/api/restaurants/:id` | Eliminar restaurante | ADMINISTRADOR |
| GET | `/api/restaurants/:id/menu` | Ver menú | Autenticado |
| POST | `/api/restaurants/:id/menu` | Crear producto | RESTAURANTE |
| PUT | `/api/restaurants/menu/:itemId` | Actualizar producto | RESTAURANTE |
| DELETE | `/api/restaurants/menu/:itemId` | Eliminar producto | RESTAURANTE |

### Órdenes
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/orders` | Crear orden | CLIENTE |
| GET | `/api/orders/my` | Mis órdenes | CLIENTE |
| GET | `/api/orders/restaurant/:id` | Órdenes del restaurante | RESTAURANTE |
| GET | `/api/orders/ready` | Órdenes listas | REPARTIDOR |
| GET | `/api/orders/:id` | Detalle de orden | Autenticado |
| PUT | `/api/orders/:id/status` | Actualizar estado | RESTAURANTE |
| PUT | `/api/orders/:id/cancel` | Cancelar orden | CLIENTE, RESTAURANTE, REPARTIDOR |
| PUT | `/api/orders/:id/reject` | Rechazar orden | RESTAURANTE |

### Delivery
| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/delivery/accept` | Aceptar pedido | REPARTIDOR |
| PUT | `/api/delivery/status` | Actualizar estado entrega | REPARTIDOR |
| GET | `/api/delivery/available` | Órdenes disponibles | REPARTIDOR |
| GET | `/api/delivery/my` | Mis entregas | REPARTIDOR |

## 🐳 Docker

Cada servicio tiene su propio Dockerfile optimizado con imágenes `node:18-alpine`. El frontend usa un build multi-stage con nginx para servir la aplicación estática.

## 📁 Estructura del Proyecto

```
SA_PROYECTO_201346084/
├── docker-compose.yml
├── .gitignore
├── README.md
├── proto/                    # Definiciones gRPC compartidas
│   ├── auth.proto
│   ├── restaurant.proto
│   ├── order.proto
│   ├── delivery.proto
│   └── notification.proto
├── api-gateway/              # API Gateway (REST → gRPC)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── auth-service/             # Servicio de autenticación
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── restaurant-catalog-service/ # Catálogo de restaurantes
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── order-service/            # Gestión de órdenes
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── delivery-service/         # Gestión de entregas
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── notification-service/     # Notificaciones por email
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── frontend/                 # Aplicación React
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
```
