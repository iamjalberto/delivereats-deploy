require("dotenv").config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { initDB } = require("./db");
const handlers = require("./handlers");
const ratingHandlers = require("./ratingHandlers");

const PROTO_PATH = path.join(__dirname, "proto/order.proto");
const RATING_PROTO_PATH = path.join(__dirname, "proto/rating.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

const ratingPackageDef = protoLoader.loadSync(RATING_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const ratingProto = grpc.loadPackageDefinition(ratingPackageDef).rating;

const { connectWithRetry: connectRabbitMQ } = require("./queue");

const startServer = async () => {
  await initDB();
  await connectRabbitMQ();

  const server = new grpc.Server();

  server.addService(orderProto.OrderService.service, {
    CreateOrder: handlers.createOrder,
    GetOrder: handlers.getOrder,
    ListOrdersByClient: handlers.listOrdersByClient,
    ListOrdersByRestaurant: handlers.listOrdersByRestaurant,
    ListReadyOrders: handlers.listReadyOrders,
    UpdateOrderStatus: handlers.updateOrderStatus,
    CancelOrder: handlers.cancelOrder,
    ListAllOrders: handlers.listAllOrders,
  });

  server.addService(ratingProto.RatingService.service, {
    CreateRating: ratingHandlers.createRating,
    GetRatingsByRestaurant: ratingHandlers.getRatingsByRestaurant,
    GetRatingsByDelivery: ratingHandlers.getRatingsByDelivery,
    GetRatingsByProduct: ratingHandlers.getRatingsByProduct,
    GetAverageRating: ratingHandlers.getAverageRating,
  });

  const port = process.env.PORT || "50053";
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error("[Order-Service] Failed to start:", err);
        return;
      }
      console.log(`[Order-Service] gRPC server running on port ${boundPort}`);
    },
  );
};

startServer();
