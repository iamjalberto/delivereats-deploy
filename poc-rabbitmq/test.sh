#!/bin/bash
# =====================================================
# Test PoC RabbitMQ - Práctica 4
# Crea una orden en Order-Service y verifica que
# Restaurant-Service la reciba vía la cola
# =====================================================

echo "=============================================="
echo "  PoC RabbitMQ - Delivereats Práctica 4"
echo "=============================================="

echo ""
echo "1️⃣  Verificando health de servicios..."
echo ""

echo "--- Order-Service ---"
curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || echo "❌ Order-Service no disponible"
echo ""

echo "--- Restaurant-Service ---"
curl -s http://localhost:3002/health | python3 -m json.tool 2>/dev/null || echo "❌ Restaurant-Service no disponible"
echo ""

echo "=============================================="
echo "2️⃣  Creando una orden (Productor → Cola)..."
echo "=============================================="
echo ""

curl -s -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "customer_name": "José Alberto",
    "customer_email": "jose@test.com",
    "restaurant_id": 1,
    "restaurant_name": "Pizza Planet",
    "delivery_address": "Ciudad Universitaria USAC, Zona 12",
    "items": [
      {"menu_item_id": 1, "name": "Pizza Margherita", "quantity": 2, "price": 45.00},
      {"menu_item_id": 2, "name": "Coca-Cola 600ml", "quantity": 2, "price": 12.00}
    ]
  }' | python3 -m json.tool

echo ""
echo "=============================================="
echo "3️⃣  Esperando 2 segundos para que el consumidor procese..."
echo "=============================================="
sleep 2

echo ""
echo "=============================================="
echo "4️⃣  Verificando órdenes recibidas en Restaurant-Service..."
echo "=============================================="
echo ""

curl -s http://localhost:3002/orders/received | python3 -m json.tool

echo ""
echo "=============================================="
echo "✅ PoC completado. Revisa los logs de docker:"
echo "   docker compose logs order-service"
echo "   docker compose logs restaurant-service"
echo "=============================================="
