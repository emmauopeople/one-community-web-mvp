// frontend/src/pages/Landing/LandingPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import appLogo from "../../assets/images/appLogo.png";

export default function LandingPage() {
  const navigate = useNavigate();

  // ----------------------------
  // Hero search
  // ----------------------------
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const handleUseMyLocationForSearch = () => {
    setLocation("Near me");
  };

  const handleSearch = () => {
    const q = encodeURIComponent(keyword.trim());
    const loc = encodeURIComponent(
      (location.trim() || "Near me").toLowerCase() === "near me"
        ? "near"
        : location.trim(),
    );
    navigate(`/search?q=${q}&loc=${loc}`);
  };

  // ----------------------------
  // Weather widget (Open-Meteo)
  // ----------------------------
  const [weatherState, setWeatherState] = useState({
    loading: false,
    error: "",
    denied: false,
    success: false,
    place: "",
    todayText: "",
    nextDays: [],
  });

  const [cityInput, setCityInput] = useState("");
  const abortRef = useRef(null);
  const lastRequestRef = useRef(null);

  const weatherCodeToText = useMemo(() => {
    const map = new Map([
      [0, "Clear sky"],
      [1, "Mainly clear"],
      [2, "Partly cloudy"],
      [3, "Overcast"],
      [45, "Fog"],
      [48, "Rime fog"],
      [51, "Light drizzle"],
      [53, "Drizzle"],
      [55, "Heavy drizzle"],
      [61, "Light rain"],
      [63, "Rain"],
      [65, "Heavy rain"],
      [71, "Light snow"],
      [73, "Snow"],
      [75, "Heavy snow"],
      [80, "Rain showers"],
      [95, "Thunderstorm"],
      [99, "Thunderstorm + hail"],
    ]);
    return (code) => map.get(Number(code)) || "Weather";
  }, []);

  const cToF = (c) => {
    const n = Number(c);
    if (Number.isNaN(n)) return null;
    return Math.round((n * 9) / 5 + 32);
  };

  const safeAbort = () => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
      abortRef.current = null;
    }
  };

  const fetchForecastByCoords = async ({ lat, lon, placeLabel }) => {
    safeAbort();
    const controller = new AbortController();
    abortRef.current = controller;

    setWeatherState((prev) => ({
      ...prev,
      loading: true,
      error: "",
      denied: false,
      success: false,
      place: "",
      todayText: "",
      nextDays: [],
    }));

    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&current=temperature_2m,weathercode` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=auto&forecast_days=4`;

    try {
      const res = await fetch(forecastUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
      const data = await res.json();

      const daily = data?.daily || {};
      const tMax = Array.isArray(daily?.temperature_2m_max)
        ? daily.temperature_2m_max
        : [];
      const tMin = Array.isArray(daily?.temperature_2m_min)
        ? daily.temperature_2m_min
        : [];
      const wCode = Array.isArray(daily?.weathercode) ? daily.weathercode : [];
      const times = Array.isArray(daily?.time) ? daily.time : [];

      const curTempF = cToF(data?.current?.temperature_2m);
      const curCode = data?.current?.weathercode;

      const todayHighF = cToF(tMax[0]);
      const todayLowF = cToF(tMin[0]);

      const todayParts = [];
      if (curTempF !== null) todayParts.push(`Now: ${curTempF}°F`);
      if (curCode !== undefined && curCode !== null)
        todayParts.push(weatherCodeToText(curCode));
      if (todayHighF !== null && todayLowF !== null)
        todayParts.push(`Today: H ${todayHighF}° / L ${todayLowF}°`);

      const nextDays = [1, 2, 3]
        .map((i) => {
          const dateStr = times[i] || "";
          const hi = cToF(tMax[i]);
          const lo = cToF(tMin[i]);
          const code = wCode[i];
          const label = dateStr
            ? new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short",
              })
            : `Day ${i}`;
          return {
            key: `${i}-${dateStr || "x"}`,
            label,
            hi,
            lo,
            desc: weatherCodeToText(code),
          };
        })
        .filter((d) => d.hi !== null || d.lo !== null);

      setWeatherState({
        loading: false,
        error: "",
        denied: false,
        success: true,
        place: placeLabel || "Near you",
        todayText: todayParts.join(" • ") || "Weather available",
        nextDays,
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      setWeatherState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Failed to load weather",
        success: false,
      }));
    }
  };

  const getGeoCoords = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 2 * 60 * 1000 },
      );
    });

  const loadWeatherFromGeolocation = async () => {
    setWeatherState((prev) => ({
      ...prev,
      loading: true,
      error: "",
      denied: false,
      success: false,
    }));

    try {
      const pos = await getGeoCoords();
      const lat = pos?.coords?.latitude;
      const lon = pos?.coords?.longitude;
      if (typeof lat !== "number" || typeof lon !== "number")
        throw new Error("Invalid coordinates");

      lastRequestRef.current = { type: "coords", lat, lon, place: "Near you" };
      await fetchForecastByCoords({ lat, lon, placeLabel: "Near you" });
    } catch (err) {
      const denied = err?.code === 1 || /denied/i.test(err?.message || "");
      setWeatherState((prev) => ({
        ...prev,
        loading: false,
        error: denied ? "" : err?.message || "Unable to get location",
        denied: true,
        success: false,
      }));
    }
  };

  const geocodeCity = async (cityName) => {
    safeAbort();
    const controller = new AbortController();
    abortRef.current = controller;

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName,
    )}&count=1&language=en&format=json`;

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`City lookup failed (${res.status})`);
    const data = await res.json();
    const first = Array.isArray(data?.results) ? data.results[0] : null;

    if (
      !first ||
      typeof first.latitude !== "number" ||
      typeof first.longitude !== "number"
    ) {
      throw new Error("City not found");
    }
    return {
      lat: first.latitude,
      lon: first.longitude,
      place: first.name || cityName,
    };
  };

  const handleCitySubmit = async () => {
    const city = cityInput.trim();
    if (!city) return;

    setWeatherState((prev) => ({
      ...prev,
      loading: true,
      error: "",
      success: false,
      denied: false,
    }));

    try {
      const geo = await geocodeCity(city);
      lastRequestRef.current = {
        type: "city",
        city: geo.place,
        lat: geo.lat,
        lon: geo.lon,
        place: geo.place,
      };
      await fetchForecastByCoords({
        lat: geo.lat,
        lon: geo.lon,
        placeLabel: geo.place,
      });
    } catch (err) {
      if (err?.name === "AbortError") return;
      setWeatherState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Unable to load city weather",
        success: false,
        denied: true,
      }));
    }
  };

  const handleWeatherRetry = async () => {
    const last = lastRequestRef.current;
    if (!last) return loadWeatherFromGeolocation();
    if (last.type === "coords")
      return fetchForecastByCoords({
        lat: last.lat,
        lon: last.lon,
        placeLabel: last.place || "Near you",
      });
    if (last.type === "city")
      return fetchForecastByCoords({
        lat: last.lat,
        lon: last.lon,
        placeLabel: last.place || last.city || "City",
      });
    return loadWeatherFromGeolocation();
  };

  useEffect(() => {
    loadWeatherFromGeolocation();
    return () => safeAbort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Popular categories
  // ----------------------------
  const categories = [
    { label: "Carpentry", slug: "carpentry", id: "cat-chip-carpentry" },
    { label: "Plumbing", slug: "plumbing", id: "cat-chip-plumbing" },
    { label: "Cleaning", slug: "cleaning", id: "cat-chip-cleaning" },
    { label: "Tutor", slug: "tutor", id: "cat-chip-tutor" },
    { label: "Hair/Beauty", slug: "hair-beauty" },
    { label: "Mechanic", slug: "mechanic" },
    { label: "Catering", slug: "catering" },
    { label: "Painting", slug: "painting" },
    { label: "Tailor", slug: "tailor" },
    { label: "Trucker", slug: "trucker" },
  ];

  const goCategory = (slug) =>
    navigate(`/search?category=${encodeURIComponent(slug)}&loc=near`);

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col text-slate-900">
      {/* Header (full width, flush) */}
      <header className="w-full sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link
            to="/"
            id="nav-logo"
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
            id="nav-provider-auth-link"
            className="h-10 px-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition text-sm"
          >
            Become a Provider
          </Link>
        </div>
      </header>

      {/* Main (content area) */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-5 space-y-4">
        {/* Hero Search (Card) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h1 className="text-xl font-semibold leading-tight">
            Find trusted local skill providers near you
          </h1>

          <div className="mt-4 space-y-3">
            <input
              id="hero-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="What do you need? (plumber, tailor…)"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              autoComplete="off"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                id="hero-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (Near me or City)"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 sm:col-span-2"
                autoComplete="off"
              />

              <button
                id="hero-gps-btn"
                type="button"
                onClick={handleUseMyLocationForSearch}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium hover:bg-slate-100 active:scale-[0.99] transition"
              >
                Use my location
              </button>
            </div>

            <button
              id="hero-search-btn"
              type="button"
              onClick={handleSearch}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition"
            >
              Search
            </button>

            <p className="text-xs text-slate-600">
              Enable location for nearby results.
            </p>
          </div>
        </section>

        {/* Weather + Categories */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Weather Mini Frame (Card) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Weather near you</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Quick today + next 3 days.
                </div>
              </div>

              <button
                id="weather-gps-btn"
                type="button"
                onClick={loadWeatherFromGeolocation}
                className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium hover:bg-slate-100 active:scale-[0.99] transition whitespace-nowrap"
              >
                Use GPS
              </button>
            </div>

            {/* Loading */}
            <div
              id="weather-loading"
              className={weatherState.loading ? "mt-4" : "hidden"}
            >
              <div className="text-sm text-slate-700">Loading weather…</div>
              <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-blue-600 to-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Error */}
            <div
              id="weather-error"
              className={weatherState.error ? "mt-4" : "hidden"}
            >
              <div className="text-sm text-rose-600">{weatherState.error}</div>
              <button
                id="weather-retry"
                type="button"
                onClick={handleWeatherRetry}
                className="mt-3 h-11 w-full rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 active:scale-[0.99] transition"
              >
                Retry
              </button>
            </div>

            {/* Denied */}
            <div
              id="weather-denied"
              className={
                weatherState.denied &&
                !weatherState.loading &&
                !weatherState.success &&
                !weatherState.error
                  ? "mt-4"
                  : "hidden"
              }
            >
              <div className="text-xs text-slate-600">
                Location denied/unavailable. Enter a city to get weather.
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  id="weather-city-input"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Enter city (e.g., Douala)"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 sm:col-span-2"
                  autoComplete="off"
                />
                <button
                  id="weather-city-submit"
                  type="button"
                  onClick={handleCitySubmit}
                  className="h-11 w-full rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.99] transition"
                >
                  Get weather
                </button>
              </div>
            </div>

            {/* Success */}
            <div
              id="weather-success"
              className={weatherState.success ? "mt-4" : "hidden"}
            >
              <div
                id="weather-place"
                className="text-sm font-semibold text-slate-900"
              >
                {weatherState.place || "Near you"}
              </div>

              <div id="weather-today" className="mt-2 text-sm text-slate-700">
                {weatherState.todayText}
              </div>

              <div id="weather-next" className="mt-4">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Next 3 days
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {Array.isArray(weatherState.nextDays) &&
                  weatherState.nextDays.length > 0 ? (
                    weatherState.nextDays.map((d) => (
                      <div
                        key={d.key}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {d.label}
                        </div>
                        <div className="text-xs text-slate-600 text-right">
                          <div>{d.desc}</div>
                          <div className="font-semibold text-slate-800">
                            H {d.hi ?? "—"}° / L {d.lo ?? "—"}°
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-600">
                      No forecast available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* If denied but error exists, keep city input visible */}
            {weatherState.denied &&
            !weatherState.loading &&
            !weatherState.success &&
            weatherState.error ? (
              <div className="mt-4">
                <div className="text-xs text-slate-600">
                  Try entering a city instead:
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    id="weather-city-input"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Enter city (e.g., Douala)"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 sm:col-span-2"
                    autoComplete="off"
                  />
                  <button
                    id="weather-city-submit"
                    type="button"
                    onClick={handleCitySubmit}
                    className="h-11 w-full rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.99] transition"
                  >
                    Get weather
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Popular Categories (Card) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="text-sm font-semibold">Popular categories</div>

            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.slug}
                  id={c.id}
                  type="button"
                  onClick={() => goCategory(c.slug)}
                  className="h-11 px-4 rounded-full border border-slate-200 bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition"
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="mt-3 text-xs text-slate-600">
              Tip: categories open a quick search near you.
            </div>
          </div>
        </section>
      </main>

      {/* Footer (full width, fixed bottom of page flow like ProviderAuth) */}
      <footer className="w-full border-t border-slate-200 bg-white">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link
              id="footer-about"
              to="/about"
              className="text-slate-700 hover:text-blue-600"
            >
              About One Community
            </Link>

            <Link
              id="footer-contact"
              to="/contact"
              className="text-slate-700 hover:text-blue-600"
            >
              Contact One Community
            </Link>

            <Link
              id="footer-terms"
              to="/terms"
              className="text-slate-700 hover:text-blue-600"
            >
              Terms
            </Link>

            <Link
              id="footer-privacy"
              to="/privacy"
              className="text-slate-700 hover:text-blue-600"
            >
              Privacy
            </Link>

            <Link
              id="footer-provider-auth"
              to="/provider/auth"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Become a Provider
            </Link>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            © {new Date().getFullYear()} One Community. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
