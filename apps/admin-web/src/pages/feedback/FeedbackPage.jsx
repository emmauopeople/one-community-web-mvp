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
    <article className="bg-white border rounded-xl p-4 space-y-3 text-sm">
      <h2 className="font-medium text-base break-words">
        {item.subject || t(labels[item.kind])}
      </h2>
      <p>
        {t(labels[item.category] || labels[item.kind])} Â· {item.channel} Â·{" "}
        {item.language.toUpperCase()} Â·{" "}
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
                {t(labels[r.delivery_status])} Â·{" "}
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
            {t(busy ? "Savingâ€¦" : "Send reply")}
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
    [data, setData] = useState({ items: [], summary: [] }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try {
      setData((await api.get("/feedback", { params: { kind, page } })).data);
      setError("");
    } catch {
      setError("Unable to load feedback.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [kind, page]);
  const yes = data.summary
      .filter((x) => x.kind === "survey" && x.useful === true)
      .reduce((n, x) => n + x.count, 0),
    no = data.summary
      .filter((x) => x.kind === "survey" && x.useful === false)
      .reduce((n, x) => n + x.count, 0);
  return (
    <DashboardLayout title="Community feedback">
      <div className="space-y-4">
        <p className="text-sm">
          {t("Cameroon usefulness survey")}: {t("Yes")} {yes} Â· {t("No")} {no}
        </p>
        <p className="text-xs text-gray-600">
          {t(
            "Voluntary responses, not unique people or a representative sample.",
          )}
        </p>
        <label>
          {t("Type")}{" "}
          <select
            className="border rounded p-2"
            value={kind}
            onChange={(e) => {
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
        {loading && <p>{t("Loadingâ€¦")}</p>}
        {!loading && !error && !data.items.length && (
          <p>{t("No feedback yet.")}</p>
        )}
        {data.items.map((item) => (
          <Item key={item.id} item={item} onChange={load} />
        ))}
        <div className="flex gap-4">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            {t("Previous")}
          </button>
          <span>{page}</span>
          <button
            disabled={!data.hasMore || loading}
            onClick={() => setPage(page + 1)}
          >
            {t("Next")}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
