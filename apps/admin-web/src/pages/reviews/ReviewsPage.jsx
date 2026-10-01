import { useEffect, useState } from "react";
import axios from "axios";
import DashboardLayout from "../../components/layout/DashboardLayout";
const base = import.meta.env.VITE_API_URL || "/api/admin";
const labels = {
  pending: "Pending",
  approved: "Published",
  rejected: "Rejected",
  inactive: "Inactive",
  deleted: "Deleted",
};
function ReviewItem({ review, busy, onDecision }) {
  const [notes, setNotes] = useState(""),
    [verified, setVerified] = useState(false);
  return (
    <article className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold text-lg">
          {review.provider_name || "Provider"} · {review.rating}/5
        </h2>
        <span className="text-sm capitalize">{labels[review.status]}</span>
      </div>
      <p className="text-sm text-slate-500">
        {review.skill_title || "Provider review"} · Submitted{" "}
        {new Date(review.created_at).toLocaleString()}
      </p>
      <p className="font-semibold">{review.reviewer_name}</p>
      <p className="text-sm break-all">
        Private contact: {review.reviewer_email}
      </p>
      <p className="whitespace-pre-wrap break-words">{review.body}</p>
      {review.verification_notes && (
        <p className="text-sm bg-slate-50 p-3 rounded-lg">
          Last internal note: {review.verification_notes}
        </p>
      )}
      <label className="block text-sm">
        Internal verification / decision notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          disabled={busy}
          className="block w-full border rounded-lg p-2 mt-1"
        />
      </label>
      {review.status !== "deleted" && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            disabled={busy}
          />
          I have verified this review and approve its publication.
        </label>
      )}
      <div className="flex gap-2 flex-wrap">
        {review.status !== "approved" && review.status !== "deleted" && (
          <button
            disabled={busy || !verified || notes.trim().length < 5}
            onClick={() => onDecision(review, "approved", notes, verified)}
            className="bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-40"
          >
            Publish
          </button>
        )}
        {review.status !== "rejected" && review.status !== "deleted" && (
          <button
            disabled={busy || notes.trim().length < 5}
            onClick={() => onDecision(review, "rejected", notes, false)}
            className="bg-red-700 text-white rounded-lg px-4 py-2 disabled:opacity-40"
          >
            Reject
          </button>
        )}
        {review.status !== "pending" && (
          <button
            disabled={busy || notes.trim().length < 5}
            onClick={() => onDecision(review, "pending", notes, false)}
            className="border rounded-lg px-4 py-2 text-blue-700 disabled:opacity-40"
          >
            {review.status === "deleted"
              ? "Restore to pending"
              : "Return to pending"}
          </button>
        )}
        {review.status !== "inactive" && review.status !== "deleted" && (
          <button
            disabled={busy || notes.trim().length < 5}
            onClick={() => onDecision(review, "inactive", notes, false)}
            className="border rounded-lg px-4 py-2 text-blue-700 disabled:opacity-40"
          >
            Inactivate
          </button>
        )}
        {review.status !== "deleted" && (
          <button
            disabled={busy || notes.trim().length < 5}
            onClick={() => onDecision(review, "deleted", notes, false)}
            className="bg-red-700 text-white rounded-lg px-4 py-2 disabled:opacity-40"
          >
            Soft delete
          </button>
        )}
      </div>
    </article>
  );
}
export default function ReviewsPage() {
  const [status, setStatus] = useState("pending"),
    [page, setPage] = useState(1),
    [data, setData] = useState({ reviews: [], counts: {}, hasMore: false }),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData({ reviews: [], counts: {}, hasMore: false });
    axios
      .get(`${base}/reviews`, {
        params: { status, page },
        withCredentials: true,
        signal: controller.signal,
      })
      .then((r) => {
        if (!controller.signal.aborted) setData(r.data);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e.response?.data?.message || "Unable to load reviews.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, page, refresh]);
  async function decide(review, next, notes, verified) {
    setBusy(true);
    setError("");
    try {
      await axios.patch(
        `${base}/reviews/${review.id}`,
        { status: next, version: review.version, notes, verified },
        { withCredentials: true },
      );
      if (data.reviews.length === 1 && page > 1) setPage((p) => p - 1);
      else setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to save decision.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DashboardLayout title="Review moderation">
      <div className="max-w-4xl mx-auto space-y-4 pb-28">
        <p className="text-sm text-slate-600">
          Check the review and contact details before approval. Only approved
          reviews appear publicly. Contact emails and notes stay private.
        </p>
        <details className="rounded-lg border p-3 text-sm text-slate-600">
          <summary className="cursor-pointer text-blue-700">
            How to manage reviews
          </summary>
          <ol className="list-decimal pl-5 mt-3 space-y-2">
            <li>
              Open Pending, check the review and private contact details, and
              add decision notes.
            </li>
            <li>
              Confirm verification, then Publish to show the review publicly.
            </li>
            <li>
              Inactivate hides a review and removes it from public rating
              totals. Publish can make it visible again after verification.
            </li>
            <li>
              Soft delete moves a review to Deleted and retains its record.
              Restore to pending returns it for verification before publication.
            </li>
            <li>
              Reject reviews that cannot be approved. Every action requires
              notes and is recorded in the audit log.
            </li>
          </ol>
        </details>
        <div className="flex gap-2 flex-wrap">
          {["pending", "approved", "inactive", "rejected", "deleted"].map(
            (s) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                aria-pressed={status === s}
                className={`px-4 py-2 rounded-lg capitalize ${status === s ? "bg-blue-700 text-white" : "bg-white border"}`}
              >
                {labels[s]} ({data.counts[s] || 0})
              </button>
            ),
          )}
          <button
            disabled={busy || loading}
            onClick={() => setRefresh((n) => n + 1)}
            className="text-blue-700 px-3"
          >
            Refresh queue
          </button>
        </div>
        {error && (
          <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-lg">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Loading reviews…</p>
        ) : data.reviews.length ? (
          data.reviews.map((review) => (
            <ReviewItem
              key={review.id + ":" + review.version}
              review={review}
              busy={busy}
              onDecision={decide}
            />
          ))
        ) : (
          <p>No {labels[status].toLowerCase()} reviews.</p>
        )}
        <div className="flex gap-3">
          <button
            disabled={page === 1 || busy || loading}
            className="text-blue-700 disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
          >
            Previous page
          </button>
          <span>Page {page}</span>
          <button
            disabled={!data.hasMore || busy || loading}
            className="text-blue-700 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next page
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
