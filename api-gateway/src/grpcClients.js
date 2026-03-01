const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const loadProto = (protoFile, packageName) => {
  const PROTO_PATH = path.join(__dirname, `proto/${protoFile}`);
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDefinition)[packageName];
};

// Auth Service Client
const authProto = loadProto("auth.proto", "auth");
const authClient = new authProto.AuthService(
  process.env.AUTH_SERVICE_HOST || "auth-service:50051",
  grpc.credentials.createInsecure(),
);

// Restaurant Service Client
const restaurantProto = loadProto("restaurant.proto", "restaurant");
const restaurantClient = new restaurantProto.RestaurantCatalogService(
  process.env.RESTAURANT_SERVICE_HOST || "restaurant-catalog-service:50052",
  grpc.credentials.createInsecure(),
);

// Order Service Client
const orderProto = loadProto("order.proto", "order");
const orderClient = new orderProto.OrderService(
  process.env.ORDER_SERVICE_HOST || "order-service:50053",
  grpc.credentials.createInsecure(),
);

// Delivery Service Client
const deliveryProto = loadProto("delivery.proto", "delivery");
const deliveryClient = new deliveryProto.DeliveryService(
  process.env.DELIVERY_SERVICE_HOST || "delivery-service:50054",
  grpc.credentials.createInsecure(),
);

// Notification Service Client
const notificationProto = loadProto("notification.proto", "notification");
const notificationClient = new notificationProto.NotificationService(
  process.env.NOTIFICATION_SERVICE_HOST || "notification-service:50055",
  grpc.credentials.createInsecure(),
);

// FX Service Client (P5)
const fxProto = loadProto("fx_service.proto", "fx");
const fxClient = new fxProto.FXService(
  process.env.FX_SERVICE_HOST || "fx-service:50056",
  grpc.credentials.createInsecure(),
);

// Payment Service Client (P5)
const paymentProto = loadProto("payment.proto", "payment");
const paymentClient = new paymentProto.PaymentService(
  process.env.PAYMENT_SERVICE_HOST || "payment-service:50057",
  grpc.credentials.createInsecure(),
);

// Rating Service Client (Fase 2) - hosted in order-service
const ratingProto = loadProto("rating.proto", "rating");
const ratingClient = new ratingProto.RatingService(
  process.env.ORDER_SERVICE_HOST || "order-service:50053",
  grpc.credentials.createInsecure(),
);

// Helper para promisificar llamadas gRPC
const grpcCall = (client, method, request) => {
  return new Promise((resolve, reject) => {
    client[method](request, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

module.exports = {
  authClient,
  restaurantClient,
  orderClient,
  deliveryClient,
  notificationClient,
  fxClient,
  paymentClient,
  ratingClient,
  grpcCall,
};
