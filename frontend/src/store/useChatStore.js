import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const getId = (value) =>
  String(value?.toHexString?.() ?? value?._id ?? value);

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,


    getUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

    getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set((state) => {
        const messagesById = new Map(
          [
            ...res.data,
            ...state.messages.filter(
              (message) =>
                String(message.senderId) === String(userId) ||
                String(message.receiverId) === String(userId),
            ),
          ].map((message) => [
            String(message._id),
            message,
          ]),
        );
        return {
          messages: [...messagesById.values()].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
          ),
        };
      });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    if (!selectedUser) {
      throw new Error("Select a conversation before sending a message");
    }

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set((state) => ({
        messages: [...state.messages, res.data],
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to send message");
      throw error;
    }
  },

  subscribeToMessages: (socket) => {
    if (!socket) {
      return;
    }

    const handleNewMessage = (newMessage) => {
      const { selectedUser } = get();
      if (!selectedUser) return;
      const { authUser } = useAuthStore.getState();
      if (
        getId(newMessage.senderId) !== getId(selectedUser._id) ||
        getId(newMessage.receiverId) !== getId(authUser?._id)
      ) {
        return;
      }

      set((state) => {
        if (
          state.messages.some(
            (message) => getId(message._id) === getId(newMessage._id),
          )
        ) {
          return state;
        }
        return { messages: [...state.messages, newMessage] };
      });
    };

    socket.on("newMessage", handleNewMessage);

    return () => socket.off("newMessage", handleNewMessage);
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
  
  setSelectedUser: (selectedUser) => set({ selectedUser }),
        
    
}));