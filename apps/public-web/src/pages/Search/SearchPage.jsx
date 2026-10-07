import FeedbackFooter from "../../components/FeedbackFooter";
import { t, te, useLocale } from "../../i18n/index.js";
import React, { useEffect, useRef, useState } from "react";
import DiscoveryHeader from "../../components/DiscoveryHeader";
import WeatherWidget from "../../components/WeatherWidget";
import { api } from "../../app/api/client";
import SkillModal from "./SkillModal";
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
  useLocale();
  const initial = new URLSearchParams(window.location.search);
  const [q, setQ] = useState(initial.get("q") || ""),
    [category, setCategory] = useState(initial.get("category") || "");
  const [city, setCity] = useState(initial.get("city") || ""),
    [results, setResults] = useState([]),
    [geo, setGeo] = useState(null);
  const [radius, setRadius] = useState(10),
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
    criteria = {
      q,
      category,
      city,
    },
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
        ? {
            lat: location.lat,
            lng: location.lng,
            radius_km: searchRadius,
          }
        : {}),
    };
    activeSearch.current = {
      location,
      searchRadius,
      criteria,
    };
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
      setGeoMessage("Location unavailable. Search by town or area instead.");
      search({
        location: null,
      });
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
        search({
          location,
        });
      },
      fail,
      {
        timeout: 15000,
        maximumAge: 60000,
        enableHighAccuracy: false,
      },
    );
  }
  function disableNear() {
    ++locationRequest.current;
    setLocating(false);
    setGeo(null);
    remember(false);
    setGeoMessage("");
    search({
      location: null,
    });
  }
  useEffect(() => {
    search({
      location: null,
    });
    if (readPreference()) locate();
    return () => {
      request.current?.abort();
      ++locationRequest.current;
    };
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        <DiscoveryHeader
          category={category}
          onCategory={(value) => {
            setCategory(value);
            search({
              criteria: {
                q,
                category: value,
                city,
              },
            });
          }}
          radius={radius}
          onRadius={(value) => {
            setRadius(value);
            if (geo)
              search({
                searchRadius: value,
              });
          }}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
          className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3"
        >
          <label className="block font-bold" htmlFor="service-search">
            {t("What are you looking for?")}
          </label>
          <input
            id="service-search"
            className="w-full border border-blue-200 bg-slate-50 rounded-2xl p-4"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Service, town or area")}
            maxLength={200}
          />
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold py-4 disabled:opacity-60"
          >
            {loading ? t("Searchingâ€¦") : t("Search")}
          </button>
          <button
            type="button"
            role="switch"
            aria-label={t("Use location")}
            aria-checked={Boolean(geo)}
            disabled={locating}
            onClick={geo ? disableNear : locate}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 min-h-11 disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className={`inline-flex items-center w-8 h-5 p-0.5 rounded-full transition-colors ${geo ? "bg-blue-600" : "bg-slate-300"}`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${geo ? "translate-x-3" : ""}`}
              />
            </span>
            {locating ? t("Locatingâ€¦") : t("Use location")}
          </button>
          {geoMessage && (
            <p role="status" className="text-sm text-amber-800">
              {te(geoMessage)}
            </p>
          )}
        </form>
        <WeatherWidget location={geo} />
        <section aria-label={t("Service listings")} aria-busy={loading}>
          <h2 className="font-semibold text-xl mb-3">
            {geo ? t("Nearby services") : t("Available services")}
          </h2>
          {loading && results.length === 0 && (
            <p role="status" className="text-sm text-slate-500 mb-3">
              {t("Loading services\u2026")}
            </p>
          )}
          {error ? (
            <div role="alert" className="border rounded-xl bg-white p-4">
              <p>{te(error)}</p>
              <button
                className="text-blue-700 underline p-2"
                onClick={() => search()}
              >
                {t("Retry")}
              </button>
            </div>
          ) : !loading && results.length === 0 ? (
            <p className="bg-white rounded-xl p-5 border">
              {t("No services found")}
              {geo
                ? t(
                    " within this radius. Choose a wider radius or turn off nearby.",
                  )
                : t(". Try a service, city or area.")}
            </p>
          ) : null}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => setOpenSkillId(s.id)}
                className="text-left overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600"
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
                    {t("Local service")}
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold break-words">{s.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {[s.area, s.city].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-emerald-800 mt-1">
                    {t(s.category)}
                    {s.distance_km != null
                      ? t(" Â· about {distance} km", { distance: s.distance_km })
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
                search({
                  ...activeSearch.current,
                  nextPage: page + 1,
                })
              }
            >
              {loading ? t("Loadingâ€¦") : t("Load more")}
            </button>
          )}
        </section>
      <FeedbackFooter enabled={!loading && !openSkillId} />
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
