import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/user.model.js";

const adminEmail = process.env.ADMIN_EMAIL?.trim();

if (!adminEmail) {
  throw new Error("Set ADMIN_EMAIL in backend/.env before promoting an admin.");
}

try {
  await mongoose.connect(process.env.MONGODB_URI);

  const escapedEmail = adminEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await User.findOne({
    email: new RegExp(`^${escapedEmail}$`, "i"),
  });

  if (!user) {
    throw new Error(
      `No account exists for ADMIN_EMAIL (${adminEmail}). Create that account first.`,
    );
  }

  if (user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }

  console.log(`Admin role enabled for ${user.email}.`);
} finally {
  await mongoose.disconnect();
}
