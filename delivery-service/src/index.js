require("dotenv").config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { initDB } = require("./db");
const handlers = require("./handlers");

const PROTO_PATH = path.join(__dirname, "proto/delivery.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const deliveryProto = grpc.loadPackageDefinition(packageDefinition).delivery;

const startServer = async () => {
  await initDB();

  const server = new grpc.Server();

  server.addService(deliveryProto.DeliveryService.service, {
    AcceptOrder: handlers.acceptOrder,
    UpdateDeliveryStatus: handlers.updateDeliveryStatus,
    GetDeliveryByOrder: handlers.getDeliveryByOrder,
    ListAvailableOrders: handlers.listAvailableOrders,
    ListMyDeliveries: handlers.listMyDeliveries,
  });

  const port = process.env.PORT || "50054";
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error("[Delivery-Service] Failed to start:", err);
        return;
      }
      console.log(
        `[Delivery-Service] gRPC server running on port ${boundPort}`,
      );
    },
  );
};

startServer();
