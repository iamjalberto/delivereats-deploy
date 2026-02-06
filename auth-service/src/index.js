require("dotenv").config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { initDB } = require("./db");
const { register, login, validateToken } = require("./handlers");

const PROTO_PATH = path.join(__dirname, "proto/auth.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const startServer = async () => {
  await initDB();

  const server = new grpc.Server();

  server.addService(authProto.AuthService.service, {
    Register: register,
    Login: login,
    ValidateToken: validateToken,
  });

  const port = process.env.PORT || "50051";
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error("[Auth-Service] Failed to start:", err);
        return;
      }
      console.log(`[Auth-Service] gRPC server running on port ${boundPort}`);
    },
  );
};

startServer();
