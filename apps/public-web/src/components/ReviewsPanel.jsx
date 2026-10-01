import React, { useEffect, useRef, useState } from "react";
import { api } from "../app/api/client";
export default function ReviewsPanel({ providerId, skillId }) {
  const [reviews, setReviews] = useState([]),
    [summary, setSummary] = useState({ count: 0, average: null }),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const request = useRef(null),
    live = useRef(true);
  async function load(next = 1) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/providers/${providerId}/reviews`, {
        params: { page: next },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setReviews((old) =>
        next === 1 ? data.reviews : [...old, ...data.reviews],
      );
      setSummary(data.summary);
      setMore(data.hasMore);
      setPage(next);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e.response?.data?.error || "Unable to load reviews.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    live.current = true;
    setReviews([]);
    setSummary({ count: 0, average: null });
    setOpen(false);
    setNotice("");
    load();
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, [providerId, refresh]);
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget,
      values = new FormData(form);
    setBusy(true);
    setNotice("");
    try {
      const { data } = await api.post(`/providers/${providerId}/reviews`, {
        name: values.get("name").trim(),
        email: values.get("email").trim(),
        rating: Number(values.get("rating")),
        body: values.get("body").trim(),
        publicationConsent: values.get("consent") === "on",
        ...(skillId ? { skillId } : {}),
      });
      if (live.current) {
        setNotice(data.message);
        form.reset();
        setOpen(false);
      }
    } catch (e) {
      if (live.current)
        setNotice(
          e.response?.data?.error || "Unable to submit review. Please retry.",
        );
    } finally {
      if (live.current) setBusy(false);
    }
  }
  const input =
    "block w-full mt-1 rounded-xl border border-slate-200 p-3 bg-white";
  return (
    <section
      aria-label="Provider reviews"
      className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <button
          disabled={loading}
          className="text-blue-700 text-sm min-h-11"
          onClick={() => setRefresh((n) => n + 1)}
        >
          Refresh reviews
        </button>
      </div>
      <p className="text-sm text-slate-600">
        {summary.count
          ? `${summary.average} / 5 · ${summary.count} approved review${summary.count === 1 ? "" : "s"}`
          : loading
            ? "Loading reviews…"
            : "No approved reviews yet."}
      </p>
      {error && (
        <p role="alert" className="text-amber-800">
          {error}
        </p>
      )}
      {reviews.map((review) => (
        <article key={review.id} className="border-t border-slate-100 pt-3">
          <div className="flex justify-between gap-2">
            <h3 className="font-semibold break-words">
              {review.reviewer_name}
            </h3>
            <span
              aria-label={`${review.rating} out of 5 stars`}
              className="text-blue-700 whitespace-nowrap"
            >
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-2">
            {review.body}
          </p>
        </article>
      ))}
      {more && (
        <button
          disabled={loading}
          className="text-blue-700 min-h-11 font-semibold"
          onClick={() => load(page + 1)}
        >
          {loading ? "Loading…" : "Load more reviews"}
        </button>
      )}
      {notice && (
        <p role="status" className="text-sm text-blue-800">
          {notice}
        </p>
      )}
      <button
        className="w-full min-h-11 rounded-xl bg-blue-50 text-blue-700 font-bold"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
      >
        {open ? "Cancel review" : "Write a review"}
      </button>
      {open && (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            Display name
            <input
              name="name"
              required
              minLength={2}
              maxLength={60}
              disabled={busy}
              autoComplete="name"
              className={input}
            />
          </label>
          <label className="block text-sm">
            Email (private, for admin verification)
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              disabled={busy}
              autoComplete="email"
              className={input}
            />
          </label>
          <label className="block text-sm">
            Rating
            <select
              name="rating"
              defaultValue="5"
              disabled={busy}
              className={input}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Your review
            <textarea
              name="body"
              required
              minLength={20}
              maxLength={2000}
              rows={4}
              disabled={busy}
              className={input}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              name="consent"
              type="checkbox"
              required
              disabled={busy}
              className="mt-1"
            />
            I used this provider and agree to publish my display name, rating
            and review after admin approval.
          </label>
          <button
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold py-3 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
        </form>
      )}
    </section>
  );
}
