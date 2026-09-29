import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../app/api/client";
import SkillModal from "./SkillModal";
const categories = [
  "carpentry",
  "plumbing",
  "cleaning",
  "tutor",
  "hair-beauty",
  "mechanic",
  "catering",
  "painting",
  "tailor",
  "trucker",
];
const readPreference = () => {
  try {
    return localStorage.getItem("oc-nearby") === "yes";
  } catch {
    return false;
  }
};
const remember = (value) => {
  try {
    localStorage.setItem("oc-nearby", value ? "yes" : "no");
  } catch {}
};
export default function SearchPage() {
  const initial = new URLSearchParams(window.location.search);
  const [q, setQ] = useState(initial.get("q") || ""),
    [category, setCategory] = useState(initial.get("category") || "");
  const [city, setCity] = useState(initial.get("city") || ""),
    [results, setResults] = useState([]),
    [geo, setGeo] = useState(null);
  const [radius, setRadius] = useState(20),
    [loading, setLoading] = useState(false),
    [locating, setLocating] = useState(false);
  const [error, setError] = useState(""),
    [geoMessage, setGeoMessage] = useState(""),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [openSkillId, setOpenSkillId] = useState(null);
  const request = useRef(null),
    locationRequest = useRef(0),
    activeSearch = useRef(null);
  async function search({
    location = geo,
    nextPage = 1,
    searchRadius = radius,
    criteria = { q, category, city },
  } = {}) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    const params = {
      q: criteria.q,
      category: criteria.category,
      city: location ? "" : criteria.city,
      page: nextPage,
      ...(location
        ? { lat: location.lat, lng: location.lng, radius_km: searchRadius }
        : {}),
    };
    activeSearch.current = { location, searchRadius, criteria };
    try {
      const { data } = await api.get("/skills/search", {
        params,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setResults((old) =>
        nextPage === 1 ? data.results : [...old, ...data.results],
      );
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (e) {
      if (!controller.signal.aborted) {
        setResults([]);
        setHasMore(false);
        setError(
          e.response?.data?.error ||
            "Unable to load services. Check your connection and retry.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function locate() {
    const id = ++locationRequest.current;
    setLocating(true);
    setGeoMessage("");
    const fail = () => {
      if (id !== locationRequest.current) return;
      setLocating(false);
      setGeo(null);
      remember(false);
      setGeoMessage(
        "Location unavailable. Search by city or area instead. Browser GPS needs HTTPS or localhost.",
      );
      search({ location: null });
    };
    if (!window.isSecureContext || !navigator.geolocation) {
      fail();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== locationRequest.current) return;
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocating(false);
        setGeo(location);
        remember(true);
        search({ location });
      },
      fail,
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false },
    );
  }
  function disableNear() {
    ++locationRequest.current;
    setLocating(false);
    setGeo(null);
    remember(false);
    setGeoMessage("Showing general results.");
    search({ location: null });
  }
  useEffect(() => {
    if (readPreference()) locate();
    else search({ location: null });
    return () => {
      request.current?.abort();
      ++locationRequest.current;
    };
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto p-4 flex flex-wrap justify-between gap-3 items-center">
          <Link to="/" className="font-bold text-lg text-blue-800">
            One Community
          </Link>
          <Link
            to="/provider/auth"
            className="text-sm font-semibold text-emerald-800"
          >
            Become a provider / Sign in
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <div>
          <p className="text-emerald-700 text-sm font-semibold">
            LOCAL SERVICES, DIRECT CONNECTIONS
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">
            Find a service in your community
          </h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
          className="bg-white border rounded-2xl p-4 space-y-3"
        >
          <label className="block font-semibold" htmlFor="service-search">
            What do you need?
          </label>
          <input
            id="service-search"
            className="w-full border rounded-xl p-3"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Plumber Emana, tailor Bonaberi…"
            maxLength={200}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="bg-blue-700 text-white rounded-xl px-5 py-3 disabled:opacity-50"
              disabled={loading || locating}
            >
              {loading ? "Searching…" : "Search"}
            </button>
            <button
              type="button"
              className="border border-emerald-700 text-emerald-800 rounded-xl px-4 py-3 disabled:opacity-50"
              disabled={locating}
              onClick={geo ? disableNear : locate}
            >
              {locating
                ? "Locating…"
                : geo
                  ? "Turn off nearby"
                  : "Use my location"}
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Location is optional and used for this search, without background
            tracking.
          </p>
          {geo && (
            <label className="block text-sm">
              Search radius{" "}
              <select
                aria-label="Search radius"
                className="p-2 border rounded-lg"
                value={radius}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setRadius(r);
                  search({ searchRadius: r });
                }}
              >
                {[5, 20, 50, 100].map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
            </label>
          )}
          <details>
            <summary className="text-sm cursor-pointer py-2">
              Optional filters
            </summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <label className="text-sm">
                Category
                <select
                  className="block w-full p-3 border rounded-xl"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Town / city
                <input
                  disabled={Boolean(geo)}
                  className="block w-full p-3 border rounded-xl"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Douala"
                />
              </label>
            </div>
          </details>
          {geoMessage && (
            <p role="status" className="text-sm text-slate-600">
              {geoMessage}
            </p>
          )}
        </form>
        <section aria-label="Service listings" aria-busy={loading}>
          <h2 className="font-bold text-xl mb-3">
            {geo
              ? `Nearby services · within ${radius} km`
              : "Available services"}
          </h2>
          {error ? (
            <div role="alert" className="border rounded-xl bg-white p-4">
              <p>{error}</p>
              <button
                className="text-blue-700 underline p-2"
                onClick={() => search()}
              >
                Retry
              </button>
            </div>
          ) : !loading && results.length === 0 ? (
            <p className="bg-white rounded-xl p-5 border">
              No services found
              {geo
                ? " within this radius. Choose a wider radius or turn off nearby."
                : ". Try a service, city or area."}
            </p>
          ) : null}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => setOpenSkillId(s.id)}
                className="text-left overflow-hidden rounded-2xl bg-white border shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {s.indexImageUrl ? (
                  <img
                    src={s.indexImageUrl}
                    alt=""
                    loading="lazy"
                    width="320"
                    height="200"
                    className="w-full h-32 sm:h-40 object-cover"
                  />
                ) : (
                  <div className="h-24 sm:h-32 bg-emerald-50 flex items-center justify-center text-emerald-800 text-sm">
                    Local service
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-bold break-words">{s.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {[s.area, s.city].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-emerald-800 mt-1">
                    {s.category}
                    {s.distance_km != null
                      ? ` · about ${s.distance_km} km`
                      : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              disabled={loading}
              className="block mx-auto mt-5 px-5 py-3 rounded-xl border bg-white"
              onClick={() =>
                search({ ...activeSearch.current, nextPage: page + 1 })
              }
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </section>
      </main>
      {openSkillId && (
        <SkillModal
          skillId={openSkillId}
          onClose={() => setOpenSkillId(null)}
        />
      )}
    </div>
  );
}
