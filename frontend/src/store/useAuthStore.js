import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001": "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth: ", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile: ", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile",
      );
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;
    if (socket) {
      if (!socket.connected && !socket.active) socket.connect();
      return;
    }

    const newSocket = io(BASE_URL, {
      withCredentials: true,
      auth: (callback) => {
        axiosInstance
          .get("/auth/socket-token")
          .then((response) => callback({ token: response.data.token }))
          .catch((error) => {
            console.error(
              "Could not authorize socket connection:",
              error.response?.data?.message || error.message,
            );
            callback({ token: "" });
          });
      },
    });
    newSocket.on("connect", () => {
      console.info("Socket connected:", {
        socketId: newSocket.id,
        userId: authUser._id,
      });
    });
    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds.map(String) });
      console.info("Online users received:", userIds);
    });
    newSocket.on("disconnect", (reason) => {
      console.info("Socket disconnected:", reason);
    });
    newSocket.on("connect_error", (error) => {
      console.error("Socket connection failed:", error.message);
    });
    set({ socket: newSocket });
  },
  disconnectSocket: () => {
    const { socket } = get();
    socket?.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
