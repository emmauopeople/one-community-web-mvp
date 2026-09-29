/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";

export default function AdminDetailsPanel({
  isOpen,
  onClose,
  admin,
  onSave,
  isSaving = false,
}) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "admin",
    is_active: true,
    changePassword: false,
    newPassword: "",
    confirmPassword: "",
  });

  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (admin) {
      setFormData({
        full_name: admin.full_name || "",
        email: admin.email || "",
        role: admin.role || "admin",
        is_active: Boolean(admin.is_active),
        changePassword: false,
        newPassword: "",
        confirmPassword: "",
      });
      setLocalError("");
    }
  }, [admin]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (!formData.full_name || !formData.email || !formData.role) {
      setLocalError("Full name, email, and role are required.");
      return;
    }

    if (formData.changePassword) {
      if (!formData.newPassword || formData.newPassword.length < 8) {
        setLocalError("New password must be at least 8 characters.");
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }
    }

    onSave?.(formData);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Admin Details</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          {!admin ? (
            <p className="text-sm text-gray-500">Loading admin details...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="root_admin">Root Admin</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                  Status
                </label>
                <select
                  name="is_active"
                  value={String(formData.is_active)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.value === "true",
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="changePassword"
                    checked={formData.changePassword}
                    onChange={handleChange}
                  />
                  <span className="text-sm font-medium text-gray-800">
                    Change Password
                  </span>
                </label>

                {formData.changePassword && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {localError && (
                <p className="text-sm text-red-600">{localError}</p>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-green-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-green-600 disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save Updates"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
