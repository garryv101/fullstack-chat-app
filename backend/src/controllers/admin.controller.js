import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { disconnectUserSockets } from "../lib/socket.js";

export const getUsers = async (_req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error listing users:", error.message);
    res.status(500).json({ message: "Failed to load users" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (!/^[\da-f]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted here" });
    }

    await Message.deleteMany({
      $or: [{ senderId: user._id }, { receiverId: user._id }],
    });
    await user.deleteOne();
    disconnectUserSockets(user._id);

    res.status(200).json({ message: "User and their messages deleted" });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res.status(500).json({ message: "Failed to delete user" });
  }
};
