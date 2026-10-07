import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { t, useLocale } from "../../i18n/index.js";
import DashboardLayout from "../../components/layout/DashboardLayout";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/admin",
  withCredentials: true,
});
const labels = {
  report: "Report issues",
  survey: "Your opinion",
  app_problem: "App problem",
  suggestion: "Suggestion",
  application_comment: "Application comment",
  provider_problem: "Provider problem",
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  captured: "Location captured",
  denied: "Location declined",
  unavailable: "Location unavailable",
  not_requested: "Location not requested",
  sending: "Delivery pending",
  sent: "Accepted by mail server",
  failed: "Delivery unconfirmed",
};
function Item({ item, onChange }) {
  const [body, setBody] = useState(""),
    [history, setHistory] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState(false);
  const key = useRef(null);
  async function load() {
    try {
      setHistory(
        (await api.get("/feedback/" + item.id + "/replies")).data.replies,
      );
    } catch {
      setMessage("Unable to load replies.");
    }
  }
  async function send(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    key.current ||= crypto.randomUUID();
    try {
      const r = await api.post("/feedback/" + item.id + "/replies", {
        body,
        requestId: key.current,
      });
      setBody("");
      key.current = null;
      setMessage(
        r.data.localOnly
          ? "Reply saved in local Mailpit. No external email was sent."
          : "Reply accepted by the mail server.",
      );
    } catch {
      setMessage(
        "Reply delivery could not be confirmed. Check delivery history before retrying.",
      );
    } finally {
      await load();
      setBusy(false);
    }
  }
  return (
    <article className="space-y-4 text-sm">
      <h2 className="font-medium text-base break-words">
        {item.subject || t(labels[item.kind])}
      </h2>
      <p>
        {t(labels[item.category] || labels[item.kind])} · {item.channel} ·{" "}
        {item.language.toUpperCase()} ·{" "}
        {new Date(item.created_at).toLocaleString()}
      </p>
      <p className="whitespace-pre-wrap break-words">{item.description}</p>
      {item.useful !== null && (
        <p>
          {t("Useful in Cameroon")}: {t(item.useful ? "Yes" : "No")}
        </p>
      )}
      <p>
        {t(labels[item.location_status])}
        {item.location_status === "captured"
          ? `: ${item.latitude}, ${item.longitude}`
          : ""}
      </p>
      <p>{item.contact_consent ? item.email : t("No contact consent")}</p>
      <label>
        {t("Status")}{" "}
        <select
          disabled={busy}
          value={item.status}
          onChange={async (e) => {
            setBusy(true);
            try {
              await api.patch("/feedback/" + item.id, {
                status: e.target.value,
              });
              await onChange();
            } catch {
              setMessage("Unable to update status.");
            } finally {
              setBusy(false);
            }
          }}
          className="border rounded p-2"
        >
          {["new", "in_progress", "resolved"].map((s) => (
            <option key={s} value={s}>
              {t(labels[s])}
            </option>
          ))}
        </select>
      </label>
      <button
        className="text-blue-700 block"
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) load();
        }}
      >
        {t("Reply history")}
      </button>
      {expanded && (
        <div>
          {history.map((r) => (
            <div key={r.id} className="border-l-2 p-2 my-2">
              <p className="whitespace-pre-wrap break-words">{r.body}</p>
              <small>
                {t(labels[r.delivery_status])} ·{" "}
                {new Date(r.created_at).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      )}
      {item.contact_consent && item.email && (
        <form onSubmit={send} className="space-y-2">
          <label className="block">
            {t("Email reply")}
            <textarea
              required
              maxLength={3000}
              rows={3}
              className="block border rounded p-2 w-full"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                key.current = null;
              }}
            />
          </label>
          <button
            disabled={busy || !body.trim()}
            className="bg-blue-700 text-white rounded px-4 py-2"
          >
            {t(busy ? "Saving…" : "Send reply")}
          </button>
        </form>
      )}
      {message && <p role="status">{t(message)}</p>}
    </article>
  );
}
export default function FeedbackPage() {
  useLocale();
  const [kind, setKind] = useState("all"),
    [page, setPage] = useState(1),
    [selectedId, setSelectedId] = useState(null),
    [data, setData] = useState({ items: [], summary: [] }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const detailsHeading = useRef(null);
  const requestSequence = useRef(0);
  const selected = data.items.find((item) => item.id === selectedId);
  useEffect(() => {
    if (selectedId !== null) detailsHeading.current?.focus();
  }, [selectedId]);
  async function load() {
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const result = (await api.get("/feedback", { params: { kind, page } }))
        .data;
      if (sequence !== requestSequence.current) return;
      setData(result);
      setError("");
    } catch {
      if (sequence === requestSequence.current)
        setError("Unable to load feedback.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    load();
    return () => {
      requestSequence.current += 1;
    };
  }, [kind, page]);
  const yes = data.summary
      .filter((x) => x.kind === "survey" && x.useful === true)
      .reduce((n, x) => n + x.count, 0),
    no = data.summary
      .filter((x) => x.kind === "survey" && x.useful === false)
      .reduce((n, x) => n + x.count, 0);
  return (
    <DashboardLayout title={t("Community feedback")}>
      <div className="space-y-4">
        <p className="text-sm">
          {t("Cameroon usefulness survey")}: {t("Yes")} {yes} · {t("No")} {no}
        </p>
        <p className="text-xs text-gray-600">
          {t(
            "Voluntary responses, not unique people or a representative sample.",
          )}
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <section
            aria-label={t("Community feedback")}
            className="bg-white rounded-2xl shadow-sm p-5 space-y-4 min-w-0"
          >
            <label>
              {t("Type")}{" "}
              <select
                className="border rounded p-2"
                value={kind}
                onChange={(e) => {
                  setSelectedId(null);
                  setKind(e.target.value);
                  setPage(1);
                }}
              >
                {["all", "report", "survey"].map((k) => (
                  <option key={k} value={k}>
                    {t(k === "all" ? "All" : labels[k])}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p role="alert">
                {t(error)} <button onClick={load}>{t("Retry")}</button>
              </p>
            )}
            {loading && <p>{t("Loading…")}</p>}
            {!loading && !error && !data.items.length && (
              <p>{t("No feedback yet.")}</p>
            )}
            {!error && data.items.length > 0 && (
              <div
                className="overflow-auto max-h-[65vh] rounded-xl border"
                aria-busy={loading}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-blue-700 text-white text-left">
                    <tr>
                      {["Opinion", "Date", "Status"].map((label) => (
                        <th key={label} scope="col" className="p-3 font-medium">
                          {t(label)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => !loading && setSelectedId(item.id)}
                        className={`border-b last:border-0 cursor-pointer ${selectedId === item.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="p-3 break-words max-w-64">
                          <button
                            type="button"
                            disabled={loading}
                            aria-pressed={selectedId === item.id}
                            onClick={() => setSelectedId(item.id)}
                            className="text-left text-blue-700 font-medium rounded focus-visible:outline-2 focus-visible:outline-blue-600"
                          >
                            {item.subject || t(labels[item.kind])}
                          </button>
                          {item.useful !== null && (
                            <p className="mt-1 text-xs text-gray-600">
                              {t("Useful in Cameroon")}:{" "}
                              {t(item.useful ? "Yes" : "No")}
                            </p>
                          )}
                          {item.description && (
                            <p className="mt-1 text-gray-600 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap text-gray-600">
                          <time dateTime={item.created_at}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </time>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${item.status === "resolved" ? "bg-green-100 text-green-700" : item.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {t(labels[item.status])}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-4">
              <button
                disabled={page === 1 || loading}
                onClick={() => {
                  setSelectedId(null);
                  setPage(page - 1);
                }}
              >
                {t("Previous")}
              </button>
              <span>{page}</span>
              <button
                disabled={!data.hasMore || loading}
                onClick={() => {
                  setSelectedId(null);
                  setPage(page + 1);
                }}
              >
                {t("Next")}
              </button>
            </div>
          </section>
          <section
            aria-labelledby="feedback-details-title"
            className="bg-white rounded-2xl shadow-sm p-5 min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto"
          >
            <h2
              id="feedback-details-title"
              ref={detailsHeading}
              tabIndex={-1}
              className="text-base font-medium text-gray-800 mb-4 outline-none"
            >
              {t("Feedback details")}
            </h2>
            {selected ? (
              <Item key={selected.id} item={selected} onChange={load} />
            ) : (
              <p className="text-sm text-gray-500">
                {t("Select feedback to view details.")}
              </p>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
