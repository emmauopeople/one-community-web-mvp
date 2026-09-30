import React, { useEffect, useRef, useState } from "react";
const douala = { lat: 4.05, lng: 9.7, label: "Douala" };
const describe = (code) =>
  code === 0
    ? "Clear sky"
    : code <= 3
      ? "Cloudy"
      : code <= 48
        ? "Fog"
        : code <= 67
          ? "Rain"
          : code <= 77
            ? "Snow"
            : code <= 82
              ? "Showers"
              : "Thunderstorms";
export default function WeatherWidget({ location }) {
  const [place, setPlace] = useState(douala),
    [city, setCity] = useState(""),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  const lookup = useRef(null);
  useEffect(() => {
    lookup.current?.abort();
    setBusy(false);
    setCity("");
    setPlace(location ? { ...location, label: "Near you" } : douala);
  }, [location?.lat, location?.lng]);
  useEffect(() => () => lookup.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    let timeout;
    setError("");
    setData(null);
    const key = `oc-weather-v1:${place.lat.toFixed(2)}:${place.lng.toFixed(2)}`;
    try {
      const cached = JSON.parse(sessionStorage.getItem(key));
      if (cached && Date.now() - cached.at < 900000) {
        setData(cached.data);
        return () => controller.abort();
      }
    } catch {}
    timeout = setTimeout(() => controller.abort(), 8000);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat.toFixed(2)}&longitude=${place.lng.toFixed(2)}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((value) => {
        if (!Number.isFinite(value.current?.temperature_2m)) throw Error();
        if (controller.signal.aborted) return;
        setData(value);
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({ at: Date.now(), data: value }),
          );
        } catch {}
      })
      .catch(() => {
        if (!disposed) setError("Weather unavailable");
      })
      .finally(() => clearTimeout(timeout));
    let disposed = false;
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [place, retry]);
  async function chooseCity(e) {
    e.preventDefault();
    if (!city.trim()) return;
    lookup.current?.abort();
    const controller = new AbortController();
    lookup.current = controller;
    setBusy(true);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`,
        { signal: controller.signal },
      );
      if (!response.ok) throw Error();
      const result = (await response.json()).results?.[0];
      if (!result) {
        setError("City not found");
        return;
      }
      if (!controller.signal.aborted)
        setPlace({
          lat: result.latitude,
          lng: result.longitude,
          label: [result.name, result.country].filter(Boolean).join(", "),
        });
    } catch {
      if (lookup.current === controller) setError("City lookup unavailable");
    } finally {
      clearTimeout(timeout);
      if (lookup.current === controller) setBusy(false);
    }
  }
  return (
    <section
      aria-label="Weather"
      className="rounded-2xl border border-sky-100 bg-sky-50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Weather</h2>
          <p className="text-sm text-slate-600">{place.label}</p>
        </div>
        <div className="text-right" aria-live="polite">
          {data ? (
            <>
              <p className="text-2xl font-bold text-blue-800">
                {Math.round(data.current.temperature_2m)}°C
              </p>
              <p className="text-xs text-slate-600">
                {describe(data.current.weather_code)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              {error || "Loading weather…"}
            </p>
          )}
        </div>
      </div>
      {error && (
        <button
          className="text-blue-700 text-sm min-h-11"
          onClick={() => setRetry((n) => n + 1)}
        >
          Retry weather
        </button>
      )}
      {data?.daily?.time && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {data.daily.time.slice(1, 4).map((day, i) => (
            <div key={day} className="rounded-xl bg-white/80 p-2 text-center">
              <p className="text-xs text-slate-500">
                {new Date(day + "T12:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                })}
              </p>
              <p className="text-sm font-semibold">
                {Math.round(data.daily.temperature_2m_max[i + 1])}° /{" "}
                {Math.round(data.daily.temperature_2m_min[i + 1])}°
              </p>
            </div>
          ))}
        </div>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-blue-700 min-h-11 flex items-center">
          Change city
        </summary>
        <form onSubmit={chooseCity} className="flex gap-2">
          <input
            aria-label="Weather city"
            placeholder="Town or city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            className="min-w-0 flex-1 rounded-xl border p-2"
          />
          <button
            disabled={busy}
            className="rounded-xl bg-blue-700 text-white px-3 min-h-11 disabled:opacity-50"
          >
            {busy ? "…" : "Apply"}
          </button>
        </form>
        {error && (
          <p role="status" className="text-sm text-slate-600">
            {error}
          </p>
        )}
      </details>
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-slate-500"
      >
        Weather by Open-Meteo
      </a>
    </section>
  );
}
