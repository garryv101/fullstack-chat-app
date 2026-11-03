import { useEffect, useState } from "react";
import { Shield, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const AdminPage = () => {
  const [users, setUsers] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    axiosInstance
      .get("/admin/users")
      .then((response) => {
        if (isCurrent) setUsers(response.data);
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Failed to load users");
        if (isCurrent) setUsers([]);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleDelete = async (user) => {
    if (
      user.role === "admin" ||
      !window.confirm(
        `Delete ${user.fullName} and permanently remove their messages?`,
      )
    ) {
      return;
    }

    setDeletingUserId(user._id);
    try {
      await axiosInstance.delete(`/admin/users/${user._id}`);
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser._id !== user._id),
      );
      toast.success("User and their messages deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 pt-24 pb-10">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">User management</h1>
          <p className="text-sm text-base-content/70">
            Delete user accounts and their message history.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        {users === null ? (
          <p className="p-6 text-center text-base-content/70">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-center text-base-content/70">No users found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="font-medium">{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge badge-outline">{user.role}</span>
                  </td>
                  <td>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="text-right">
                    {user.role !== "admin" && (
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        disabled={deletingUserId === user._id}
                        onClick={() => handleDelete(user)}
                        aria-label={`Delete ${user.fullName}`}
                      >
                        <Trash2 className="size-4" />
                        {deletingUserId === user._id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
};

export default AdminPage;
