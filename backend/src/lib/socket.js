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

io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie ?? "";
  const tokenCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("jwt="));

  if (!tokenCookie) {
    console.warn("Socket authentication rejected: JWT cookie missing");
    next(new Error("Authentication required"));
    return;
  }

  try {
    const token = decodeURIComponent(tokenCookie.slice("jwt=".length));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "string" ||
      !decoded.userId
    ) {
      console.warn("Socket authentication rejected: JWT has no valid user ID");
      next(new Error("Invalid authentication token"));
      return;
    }

    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    console.warn("Socket authentication rejected:", error.message);
    next(new Error("Invalid authentication token"));
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
