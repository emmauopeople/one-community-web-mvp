import React, { useState } from "react";
export const CONSENT_VERSION = "provider-gps-v1.2";
export const emptyLocation = {
  region: "",
  division: "",
  subdivision: "",
  city: "",
  area: "",
};
const regions = [
  "Adamawa",
  "Centre",
  "East",
  "Far North",
  "Littoral",
  "North",
  "North West",
  "South",
  "South West",
  "West",
];
export default function OperatingLocation({
  value,
  onChange,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const location = value.operatingLocation || emptyLocation;
  const update = (patch) => onChange({ ...value, ...patch });
  const capture = () => {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) {
      setError(
        "Location capture requires HTTPS or localhost. Open this form on the PC at localhost, or use the mobile app.",
      );
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({
          operatingLocation: {
            ...location,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date(pos.timestamp).toISOString(),
          },
          locationConfirmed: false,
        });
        setBusy(false);
      },
      () => {
        setBusy(false);
        setError(
          "Location unavailable. Allow location access and retry. Account creation stays incomplete.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  return (
    <fieldset
      disabled={disabled || busy}
      className="space-y-3 rounded-xl border border-slate-200 p-3"
    >
      <legend className="font-semibold">Operating location</legend>
      <p className="text-sm text-slate-600">
        Cameroon. Save the place where you provide services. New skills use this
        location automatically.
      </p>
      <label className="block text-sm">
        Region
        <select
          aria-label="Region"
          className="block w-full border rounded-lg p-3"
          value={location.region}
          onChange={(e) =>
            update({
              operatingLocation: {
                ...location,
                region: e.target.value,
                division: "",
              },
              locationConfirmed: false,
            })
          }
        >
          <option value="">Choose region</option>
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      {["division", "subdivision", "city", "area"].map((key) => (
        <label key={key} className="block text-sm">
          {
            {
              division: "Division",
              subdivision: "Subdivision (optional)",
              city: "Town / city",
              area: "Area / quarter",
            }[key]
          }
          <input
            className="block w-full border rounded-lg p-3"
            value={location[key]}
            maxLength={120}
            onChange={(e) =>
              update({
                operatingLocation: { ...location, [key]: e.target.value },
                locationConfirmed: false,
              })
            }
          />
        </label>
      ))}
      <label className="flex items-start gap-2 text-sm">
        <input
          className="mt-1"
          type="checkbox"
          checked={value.gpsConsent === true}
          onChange={(e) =>
            update({
              gpsConsent: e.target.checked,
              consentVersion: CONSENT_VERSION,
              locationConfirmed: false,
            })
          }
        />
        I agree to GPS use to save my operating location and make my services
        discoverable nearby. This is required for a provider account. No
        background tracking.
      </label>
      <button
        type="button"
        disabled={!value.gpsConsent || disabled || busy}
        className="w-full rounded-lg bg-blue-700 text-white p-3 disabled:bg-slate-300"
        onClick={capture}
      >
        {busy ? "Capturing location…" : "Capture operating location"}
      </button>
      {location.capturedAt && (
        <>
          <p className="text-sm">
            Location captured. Reported accuracy: about{" "}
            {Math.round(location.accuracy)} m.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.locationConfirmed === true}
              onChange={(e) => update({ locationConfirmed: e.target.checked })}
            />
            This captured position represents where I provide services.
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}
