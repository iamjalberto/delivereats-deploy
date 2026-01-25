require("dotenv").config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const handlers = require("./handlers");

const PROTO_PATH = path.join(__dirname, "../../proto/notification.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const notificationProto =
  grpc.loadPackageDefinition(packageDefinition).notification;

const startServer = async () => {
  const server = new grpc.Server();

  server.addService(notificationProto.NotificationService.service, {
    SendOrderCreated: handlers.sendOrderCreated,
    SendOrderCancelledByClient: handlers.sendOrderCancelledByClient,
    SendOrderInRoute: handlers.sendOrderInRoute,
    SendOrderCancelledByRestaurant: handlers.sendOrderCancelledByRestaurant,
    SendOrderCancelledByDelivery: handlers.sendOrderCancelledByDelivery,
    SendOrderRejected: handlers.sendOrderRejected,
  });

  const port = process.env.PORT || "50055";
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error("[Notification-Service] Failed to start:", err);
        return;
      }
      console.log(
        `[Notification-Service] gRPC server running on port ${boundPort}`,
      );
    },
  );
};

startServer();
