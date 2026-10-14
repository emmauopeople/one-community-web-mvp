import { t, te, useLocale } from "../../i18n/index.js";
import { useState } from "react";
export default function CreateAdminPanel({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
  error = "",
}) {
  useLocale();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
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
    if (isCreating) return;
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
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
    });
  };
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {t("Create Admin")}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t("Close")}
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                {t("Full Name")}
              </label>
              <input
                type="text"
                name="full_name" maxLength={120}
                aria-label={t("Full Name")} required disabled={isCreating}
                value={formData.full_name}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                {t("Email")}
              </label>
              <input
                type="email"
                name="email" maxLength={254}
                aria-label={t("Email")} required disabled={isCreating}
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="new-admin-role" className="block text-xs font-semibold uppercase text-gray-500 mb-2">{t("Role")}</label>
              <select id="new-admin-role" name="role" value={formData.role} onChange={handleChange} disabled={isCreating} className="w-full rounded-xl border border-gray-300 px-4 py-2">
                <option value="admin">{t("Admin")}</option>
                <option value="root_admin">{t("Root Admin")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                {t("Password")}
              </label>
              <input
                type="password" minLength={8} maxLength={72} autoComplete="new-password"
                name="password"
                aria-label={t("Password")} required disabled={isCreating}
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                {t("Confirm Password")}
              </label>
              <input
                type="password" minLength={8} maxLength={72} autoComplete="new-password"
                name="confirmPassword"
                aria-label={t("Confirm Password")} required disabled={isCreating}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(localError || error) && <p role="alert" className="text-sm text-red-600">{te(localError || error)}</p>}

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-green-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-green-600 disabled:opacity-70"
            >
              {isCreating ? t("Creating...") : t("Create Admin")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
