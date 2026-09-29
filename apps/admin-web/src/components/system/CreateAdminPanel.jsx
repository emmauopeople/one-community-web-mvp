import { useState } from "react";

export default function CreateAdminPanel({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
}) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [localError, setLocalError] = useState("");

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (!formData.full_name || !formData.email || !formData.password) {
      setLocalError("All fields are required.");
      return;
    }

    if (formData.password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    onCreate?.({
      full_name: formData.full_name,
      email: formData.email,
      password: formData.password,
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Create Admin</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
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
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
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
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
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

            {localError && <p className="text-sm text-red-600">{localError}</p>}

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-green-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-green-600 disabled:opacity-70"
            >
              {isCreating ? "Creating..." : "Create Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
