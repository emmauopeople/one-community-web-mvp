import { useState } from "react";

export default function ProviderDetailsPanel({
  isOpen,
  onClose,
  provider,
  onSave,
  isSaving = false,
}) {
  const initialForm = {
    display_name: provider?.display_name || "",
    email: provider?.email || "",
    phone: provider?.phone || "",
    city: provider?.city || "",
    status: provider?.status || "active",
    changePassword: false,
    newPassword: "",
    confirmPassword: "",
  };

  const [formData, setFormData] = useState(initialForm);
  const [localError, setLocalError] = useState("");

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

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Provider Details
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          {!provider ? (
            <p className="text-sm text-gray-500">Loading provider details...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                  Listed Skills
                </label>
                <input
                  type="text"
                  value={provider.skills_count}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-gray-500"
                />
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
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
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
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
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
