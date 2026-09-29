import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import appLogo from "../../assets/images/appLogo.png";
import { skillsApi } from "../../app/api/skills.api";
import SkillModal from "./SkillModal";

const CATEGORY_OPTIONS = [
  { label: "All", value: "" },
  { label: "Carpentry", value: "carpentry" },
  { label: "Plumbing", value: "plumbing" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Tutor", value: "tutor" },
  { label: "Hair/Beauty", value: "hair-beauty" },
  { label: "Mechanic", value: "mechanic" },
  { label: "Catering", value: "catering" },
  { label: "Painting", value: "painting" },
  { label: "Tailor", value: "tailor" },
  { label: "Trucker", value: "trucker" },
];

function norm(v) {
  const s = String(v || "").trim();
  return s ? s : "";
}

export default function SearchPage() {
  const navigate = useNavigate();
  const loc = useLocation();

  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const [q, setQ] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [area, setArea] = useState(params.get("area") || "");
  const [useNearMe, setUseNearMe] = useState(
    (params.get("loc") || "") === "near",
  );

  const [gps, setGps] = useState({
    loading: false,
    ok: false,
    lat: null,
    lng: null,
    error: "",
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [results, setResults] = useState([]);

  const [openSkillId, setOpenSkillId] = useState(null);

  const noticeClass =
    notice.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.type === "error"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "";

  const pushUrl = (next) => {
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.category) sp.set("category", next.category);
    if (next.city) sp.set("city", next.city);
    if (next.area) sp.set("area", next.area);
    if (next.loc === "near") sp.set("loc", "near");
    navigate(`/search?${sp.toString()}`);
  };

  const requestGPS = () => {
    setNotice({ type: "", text: "" });
    setGps({ loading: true, ok: false, lat: null, lng: null, error: "" });

    if (!navigator.geolocation) {
      setGps({
        loading: false,
        ok: false,
        lat: null,
        lng: null,
        error: "Geolocation not supported",
      });
      setNotice({
        type: "error",
        text: "Geolocation not supported on this device/browser.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") {
          setGps({
            loading: false,
            ok: false,
            lat: null,
            lng: null,
            error: "Invalid coordinates",
          });
          setNotice({
            type: "error",
            text: "Unable to read location. Try again.",
          });
          return;
        }
        setGps({ loading: false, ok: true, lat, lng, error: "" });
      },
      (err) => {
        setGps({
          loading: false,
          ok: false,
          lat: null,
          lng: null,
          error: err?.message || "Denied",
        });
        setNotice({
          type: "error",
          text: "Location permission denied/unavailable. Turn on location or search by city or area.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 2 * 60 * 1000 },
    );
  };

  const runSearch = async ({ qVal, catVal, cityVal, areaVal, near }) => {
    setLoading(true);
    setNotice({ type: "", text: "" });

    try {
      const searchParams = {
        q: norm(qVal),
        category: norm(catVal),
        city: near ? "" : norm(cityVal),
        area: near ? "" : norm(areaVal),
      };

      if (near) {
        if (!gps.ok) {
          setNotice({
            type: "error",
            text: "Enable location (GPS) for near-me results.",
          });
          setResults([]);
          return;
        }
        searchParams.lat = gps.lat;
        searchParams.lng = gps.lng;
        searchParams.radius_km = 20;
      }

      const data = await skillsApi.publicSearch(searchParams);
      setResults(data?.results || []);
      if ((data?.results || []).length === 0) {
        setNotice({
          type: "error",
          text: "No results found. Try another service, city, or area.",
        });
      }
    } catch (e) {
      setNotice({
        type: "error",
        text: e?.response?.data?.error || e?.message || "Search failed.",
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync URL -> state + search
  useEffect(() => {
    const sp = new URLSearchParams(loc.search);
    const nextQ = sp.get("q") || "";
    const nextCat = sp.get("category") || "";
    const nextCity = sp.get("city") || "";
    const nextArea = sp.get("area") || "";
    const nextNear = (sp.get("loc") || "") === "near";

    setQ(nextQ);
    setCategory(nextCat);
    setCity(nextCity);
    setArea(nextArea);
    setUseNearMe(nextNear);

    if (nextNear && !gps.ok && !gps.loading) {
      requestGPS();
    } else {
      runSearch({
        qVal: nextQ,
        catVal: nextCat,
        cityVal: nextCity,
        areaVal: nextArea,
        near: nextNear,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.search]);

  // If GPS becomes available after asking, re-run near search automatically
  useEffect(() => {
    if (useNearMe && gps.ok) {
      runSearch({
        qVal: q,
        catVal: category,
        cityVal: city,
        areaVal: area,
        near: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps.ok]);

  const onSubmit = (e) => {
    e.preventDefault();
    pushUrl({
      q: norm(q),
      category: norm(category),
      city: norm(city),
      area: norm(area),
      loc: useNearMe ? "near" : "",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
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

          <Link
            to="/provider/auth"
            className="h-10 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
          >
            Provider Portal
          </Link>
        </div>
      </header>

      {/* Full-width main (no max-w “50%” effect) */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-10 2xl:px-16 py-5">
        {/* Search controls */}
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
        >
          <div className="text-sm font-semibold">Search skills</div>

          <div className="mt-3 space-y-3">
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="What do you need? (plumber, tailor…)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <input
                className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 ${
                  useNearMe ? "opacity-60" : ""
                }`}
                placeholder="City (e.g., Yaounde)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={useNearMe}
              />

              <input
                className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 ${
                  useNearMe ? "opacity-60" : ""
                }`}
                placeholder="Area (e.g., Emana, Mvog-Mbi)"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={useNearMe}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useNearMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseNearMe(checked);
                    if (checked) requestGPS();
                  }}
                />
                Near me (GPS)
              </label>

              <button
                type="button"
                onClick={requestGPS}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium hover:bg-slate-100"
              >
                Use GPS
              </button>
            </div>

            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition"
            >
              Search
            </button>

            {gps.loading ? (
              <div className="text-xs text-slate-600">Getting location…</div>
            ) : null}
            {gps.error ? (
              <div className="text-xs text-orange-700">GPS: {gps.error}</div>
            ) : null}
          </div>
        </form>

        {notice.text ? (
          <div
            className={`mt-4 rounded-xl border px-3 py-2 text-sm ${noticeClass}`}
          >
            {notice.text}
          </div>
        ) : null}

        {/* Results: 2 columns on phone */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {loading ? (
            <div className="col-span-2 text-sm text-slate-600">
              Loading results…
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setOpenSkillId(r.id)}
                className="text-left bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition"
              >
                <div className="h-28 sm:h-40 w-full bg-slate-100">
                  {r.indexImageUrl ? (
                    <img
                      src={r.indexImageUrl}
                      alt={r.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-2 sm:p-3">
                  <div className="text-sm font-semibold truncate">
                    {r.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 truncate">
                    {r.category} • {r.area || r.city}
                  </div>
                  {typeof r.distance_km === "number" ? (
                    <div className="mt-1 text-xs text-slate-500">
                      {r.distance_km.toFixed(1)} km
                    </div>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </main>

      {/* Modal */}
      {openSkillId ? (
        <SkillModal
          skillId={openSkillId}
          onClose={() => setOpenSkillId(null)}
        />
      ) : null}

      <footer className="w-full bg-white border-t border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} One Community
        </div>
      </footer>
    </div>
  );
}
