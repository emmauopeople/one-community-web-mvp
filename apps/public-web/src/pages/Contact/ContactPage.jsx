import { t, te, useLocale } from "../../i18n/index.js";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import appLogo from "../../assets/images/appLogo.png";
const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";
const categories = [
  {
    value: "general_question",
    label: "General Question",
  },
  {
    value: "technical_issue",
    label: "Technical Issue",
  },
  {
    value: "provider_complaint",
    label: "Provider Complaint",
  },
  {
    value: "service_request",
    label: "Service Request",
  },
  {
    value: "report_problem",
    label: "Report a Problem",
  },
  {
    value: "other",
    label: "Other",
  },
];
export default function ContactPage() {
  useLocale();
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "general_question",
    subject: "",
    description: "",
  });
  const [notice, setNotice] = useState({
    type: "",
    text: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const updateField = (field, value) => {
    setNotice({
      type: "",
      text: "",
    });
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice({
      type: "",
      text: "",
    });
    try {
      const response = await fetch(`${API_BASE}/support/public-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to send message.");
      }
      setForm({
        name: "",
        email: "",
        category: "general_question",
        subject: "",
        description: "",
      });
      setNotice({
        type: "success",
        text: "Your message was sent successfully. Admin will reply through the email you provided.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.message || "Failed to send message.",
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="w-full sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-900 font-semibold"
          >
            <img
              src={appLogo}
              alt={t("One Community logo")}
              className="h-8 w-8 object-contain"
            />
            <span className="text-base sm:text-lg">{t("One Community")}</span>
          </Link>

          <Link
            to="/"
            className="h-10 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
          >
            {t("Back Home")}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div>
            <h1 className="text-xl font-semibold">
              {t("Contact One Community")}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {t(
                "Send a message to the One Community admin team. Public users do not need an account. We will reply through the email address you provide.",
              )}
            </p>
          </div>

          {notice.text ? (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}
            >
              {t(notice.text)}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-slate-700"
              >
                {t("Name")}
              </label>
              <input
                id="contact-name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder={t("Your name")}
                required
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-slate-700"
              >
                {t("Email")}
              </label>
              <input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="contact-category"
                className="block text-sm font-medium text-slate-700"
              >
                {t("Message Category")}
              </label>
              <select
                id="contact-category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                className="block text-sm font-medium text-slate-700"
              >
                {t("Subject")}
              </label>
              <input
                id="contact-subject"
                value={form.subject}
                onChange={(e) => updateField("subject", e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder={t("Short subject")}
                required
              />
            </div>

            <div>
              <label
                htmlFor="contact-description"
                className="block text-sm font-medium text-slate-700"
              >
                {t("Message")}
              </label>
              <textarea
                id="contact-description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-1 min-h-36 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder={t("Write your message here...")}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                {t(
                  "Please do not send passwords, payment details, or sensitive private information.",
                )}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 disabled:opacity-60 active:scale-[0.99] transition"
            >
              {submitting ? t("Sending...") : t("Send Message")}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
