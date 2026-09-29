import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import appLogo from "../../assets/images/appLogo.png";
import { supportApi } from "../../app/api/support.api";
import { authApi } from "../../app/api/auth.api";
import { useAuth } from "../../app/state/auth.store";

const categories = [
  { value: "general_question", label: "General Question" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "account_issue", label: "Account Issue" },
  { value: "service_request", label: "Service Request" },
  { value: "report_problem", label: "Report a Problem" },
  { value: "other", label: "Other" },
];

const statusLabels = {
  incomplete: "Incomplete",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
  denied: "Denied",
};

function statusClass(status) {
  if (status === "completed")
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "in_progress")
    return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "closed")
    return "bg-slate-100 text-slate-700 border-slate-200";
  if (status === "denied") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function ProviderRequests() {
  const { user, setUser } = useAuth();

  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [notice, setNotice] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    name: "",
    category: "general_question",
    subject: "",
    description: "",
  });

  const [reply, setReply] = useState("");

  const selectedCanReply = useMemo(() => {
    return (
      selected?.status === "incomplete" || selected?.status === "in_progress"
    );
  }, [selected]);

  const loadRequests = async () => {
    setLoading(true);
    setNotice({ type: "", text: "" });

    try {
      const data = await supportApi.listProviderRequests();
      setRequests(data.requests || []);
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.response?.data?.error || "Failed to load requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openRequest = async (requestId) => {
    setDrawerLoading(true);
    setNotice({ type: "", text: "" });

    try {
      const data = await supportApi.getProviderRequest(requestId);
      setSelected(data.request);
      setMessages(data.messages || []);
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.response?.data?.error || "Failed to open request.",
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelected(null);
    setMessages([]);
    setReply("");
  };

  const updateForm = (field, value) => {
    setNotice({ type: "", text: "" });
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const createRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice({ type: "", text: "" });

    try {
      const data = await supportApi.createProviderRequest(form);

      setForm({
        name: "",
        category: "general_question",
        subject: "",
        description: "",
      });

      setNotice({
        type: "success",
        text: "Your request was submitted successfully.",
      });

      await loadRequests();

      if (data?.request?.id) {
        await openRequest(data.request.id);
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.response?.data?.error || "Failed to create request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();

    if (!selected?.id) return;

    const message = reply.trim();
    if (!message) return;

    setSendingMessage(true);
    setNotice({ type: "", text: "" });

    try {
      await supportApi.addProviderMessage(selected.id, message);
      setReply("");

      await openRequest(selected.id);
      await loadRequests();
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.response?.data?.error || "Failed to send message.",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const onLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    setUser(null);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="w-full sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-900 font-semibold"
          >
            <img
              src={appLogo}
              alt="One Community logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-base sm:text-lg">One Community</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/provider/skills"
              className="h-10 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
            >
              My Skills
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="h-10 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <div>
            <h1 className="text-xl font-semibold">Provider Requests</h1>
            <p className="mt-1 text-sm text-slate-600">
              Logged in as <span className="font-semibold">{user?.email}</span>.
              Submit requests to admin and track responses/status here.
            </p>
          </div>

          {notice.text ? (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                notice.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}
            >
              {notice.text}
            </div>
          ) : null}

          <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 lg:col-span-1">
              <h2 className="text-sm font-semibold">Create New Request</h2>

              <form onSubmit={createRequest} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="request-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Name
                  </label>
                  <input
                    id="request-name"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="Optional display name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="request-category"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Category
                  </label>
                  <select
                    id="request-category"
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
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
                    htmlFor="request-subject"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Subject
                  </label>
                  <input
                    id="request-subject"
                    value={form.subject}
                    onChange={(e) => updateForm("subject", e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="Short subject"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="request-description"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Message
                  </label>
                  <textarea
                    id="request-description"
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    className="mt-1 min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="Describe your request..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 disabled:opacity-60 active:scale-[0.99] transition"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">My Requests</h2>
                <button
                  type="button"
                  onClick={loadRequests}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 active:scale-[0.99] transition text-sm"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="mt-4 text-sm text-slate-600">
                  Loading requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No requests yet. Create your first request using the form.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {requests.map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => openRequest(request.id)}
                      className="w-full text-left rounded-2xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100 active:scale-[0.99] transition"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {request.subject}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Category: {request.category} • Messages:{" "}
                            {request.messageCount ?? "—"}
                          </div>
                        </div>

                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            request.status,
                          )}`}
                        >
                          {statusLabels[request.status] || request.status}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        Last updated:{" "}
                        {formatDate(request.lastMessageAt || request.updatedAt)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {selected ? (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Close request drawer"
            onClick={closeDrawer}
            className="absolute inset-0 bg-slate-900/30"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selected.subject}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                        selected.status,
                      )}`}
                    >
                      {statusLabels[selected.status] || selected.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      Created: {formatDate(selected.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 active:scale-[0.99] transition text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-4">
              {drawerLoading ? (
                <div className="text-sm text-slate-600">
                  Loading conversation...
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Request Details
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {selected.description}
                    </p>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold">
                      Communication Notes
                    </h3>

                    {messages.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        No messages yet.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`rounded-2xl border p-4 ${
                              message.senderType === "admin"
                                ? "border-blue-100 bg-blue-50"
                                : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm font-semibold text-slate-900">
                                {message.senderType === "admin"
                                  ? "Admin"
                                  : "You"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {formatDate(message.createdAt)}
                              </div>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                              {message.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={sendReply} className="mt-5">
                    <label
                      htmlFor="provider-reply"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Add Follow-up Message
                    </label>

                    <textarea
                      id="provider-reply"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={!selectedCanReply}
                      className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder={
                        selectedCanReply
                          ? "Write a follow-up message..."
                          : "This request is closed and cannot receive new messages."
                      }
                    />

                    <button
                      type="submit"
                      disabled={
                        !selectedCanReply || sendingMessage || !reply.trim()
                      }
                      className="mt-3 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 disabled:opacity-60 active:scale-[0.99] transition"
                    >
                      {sendingMessage ? "Sending..." : "Send Follow-up"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <footer className="w-full bg-white border-t border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} One Community — Provider Requests
        </div>
      </footer>
    </div>
  );
}
