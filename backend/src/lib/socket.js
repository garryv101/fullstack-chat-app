import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);

const allowedOrigins = new Set(
  ["http://localhost:5173", process.env.CLIENT_URL]
    .filter(Boolean)
    .map((origin) => new URL(origin).origin),
);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    if (!origin) {
      callback(null, true);
      return;
    }

    try {
      const requestOrigin = new URL(origin);
      const forwardedProtocol = request.headers["x-forwarded-proto"]
        ?.split(",")[0]
        .trim();
      const requestProtocol =
        forwardedProtocol || (request.socket.encrypted ? "https" : "http");
      const sameOrigin =
        requestOrigin.host === request.headers.host &&
        requestOrigin.protocol === `${requestProtocol}:`;

      callback(
        null,
        sameOrigin || allowedOrigins.has(requestOrigin.origin),
      );
    } catch {
      callback(null, false);
    }
  },
});

export function getReceiverRoom(userId) {
  return `user:${String(userId)}`;
}

// used to store online users
const userSocketMap = new Map(); // userId -> Set of socket IDs

export function getOnlineUserIds() {
  return [...userSocketMap.keys()];
}

export function disconnectUserSockets(userId) {
  const socketIds = userSocketMap.get(String(userId));
  if (!socketIds) return;

  for (const socketId of socketIds) {
    io.sockets.sockets.get(socketId)?.disconnect(true);
  }
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) {
      next(new Error("Socket authentication required"));
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "string" ||
      !decoded.userId ||
      decoded.purpose !== "socket"
    ) {
      next(new Error("Invalid socket token"));
      return;
    }

    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    console.warn("Socket authentication rejected:", error.message);
    next(new Error("Invalid socket token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;

  const userSockets = userSocketMap.get(userId) ?? new Set();
  userSockets.add(socket.id);
  userSocketMap.set(userId, userSockets);
  socket.join(getReceiverRoom(userId));

  const emitOnlineUsers = () => {
    const onlineUserIds = getOnlineUserIds();
    console.log("Online users:", onlineUserIds);
    io.emit("getOnlineUsers", onlineUserIds);
  };

  console.log("A user connected", userId, socket.id);
  emitOnlineUsers();

  socket.on("disconnect", () => {
    const activeSockets = userSocketMap.get(userId);
    activeSockets?.delete(socket.id);
    if (activeSockets?.size === 0) userSocketMap.delete(userId);

    console.log("A user disconnected", userId, socket.id);
    emitOnlineUsers();
  });
});

export { io, app, server };
