require("dotenv").config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { initDB } = require("./db");
const handlers = require("./handlers");

const PROTO_PATH = path.join(__dirname, "proto/restaurant.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const restaurantProto =
  grpc.loadPackageDefinition(packageDefinition).restaurant;

const startServer = async () => {
  await initDB();

  const server = new grpc.Server();

  server.addService(restaurantProto.RestaurantCatalogService.service, {
    CreateRestaurant: handlers.createRestaurant,
    GetRestaurant: handlers.getRestaurant,
    UpdateRestaurant: handlers.updateRestaurant,
    DeleteRestaurant: handlers.deleteRestaurant,
    ListRestaurants: handlers.listRestaurants,
    CreateMenuItem: handlers.createMenuItem,
    GetMenuItem: handlers.getMenuItem,
    UpdateMenuItem: handlers.updateMenuItem,
    DeleteMenuItem: handlers.deleteMenuItem,
    ListMenuItems: handlers.listMenuItems,
  });

  const port = process.env.PORT || "50052";
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error("[Restaurant-Service] Failed to start:", err);
        return;
      }
      console.log(
        `[Restaurant-Service] gRPC server running on port ${boundPort}`,
      );
    },
  );
};

startServer();
