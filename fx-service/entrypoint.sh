#!/bin/bash
set -e

PROTO_SRC="/app/proto/fx_service.proto"
PROTO_DST="/app/app/protos"

if [ -f "$PROTO_SRC" ]; then
    echo "Compilando proto desde $PROTO_SRC..."
    cp "$PROTO_SRC" "$PROTO_DST/fx_service.proto"
    python -m grpc_tools.protoc \
        -I"$PROTO_DST" \
        --python_out="$PROTO_DST" \
        --grpc_python_out="$PROTO_DST" \
        "$PROTO_DST/fx_service.proto"
    sed -i 's/^import fx_service_pb2 as fx__service__pb2/from app.protos import fx_service_pb2 as fx__service__pb2/' "$PROTO_DST/fx_service_pb2_grpc.py"
    echo "Proto compilado exitosamente"
elif [ -f "$PROTO_DST/fx_service_pb2.py" ]; then
    echo "Proto ya compilado, usando existente"
else
    echo "ADVERTENCIA: No se encontró proto ni compilado"
fi

exec python -m app.main
