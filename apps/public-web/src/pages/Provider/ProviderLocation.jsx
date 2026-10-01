import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../app/api/client";
import OperatingLocation, {
  emptyLocation,
} from "../../components/OperatingLocation";
export default function ProviderLocation() {
  const [value, setValue] = useState({
    operatingLocation: { ...emptyLocation },
    gpsConsent: false,
    locationConfirmed: false,
  });
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    api
      .get("/provider/profile")
      .then(({ data }) => {
        setSaved(
          Boolean(
            data.profile.gps_consent_at &&
            !data.profile.gps_consent_withdrawn_at,
          ),
        );
        if (data.profile.operating_location)
          setValue((v) => ({
            ...v,
            operatingLocation: data.profile.operating_location,
          }));
      })
      .catch(() => setMessage("Unable to load profile."));
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api.put("/provider/location", value);
      setSaved(true);
      setMessage(
        "Operating location saved. Existing skills keep their locations; new skills inherit this location.",
      );
    } catch (e) {
      setMessage(e.response?.data?.error || "Unable to save location.");
    } finally {
      setBusy(false);
    }
  }
  async function withdraw() {
    if (
      !window.confirm(
        "Withdraw GPS consent? Your listings will no longer appear publicly until you complete location setup again.",
      )
    )
      return;
    setBusy(true);
    try {
      await api.delete("/provider/location/consent");
      setSaved(false);
      setValue((v) => ({ ...v, gpsConsent: false, locationConfirmed: false }));
      setMessage("Consent withdrawn. You can still manage your account.");
    } catch {
      setMessage("Unable to withdraw consent. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="max-w-lg mx-auto p-4 space-y-4">
      <Link className="text-blue-700" to="/provider/skills">
        Back to my skills
      </Link>
      <h1 className="text-xl font-semibold">Provider location setup</h1>
      <p>
        Complete this once before publishing skills. You can update it here
        later.
      </p>
      <form onSubmit={save} className="space-y-4">
        <OperatingLocation value={value} onChange={setValue} disabled={busy} />
        <button
          className="bg-emerald-700 text-white rounded-xl p-3 w-full disabled:bg-slate-300"
          disabled={busy || !value.gpsConsent || !value.locationConfirmed}
        >
          Save operating location
        </button>
      </form>
      <p role="status">{message}</p>
      {saved && (
        <button
          disabled={busy}
          className="text-red-700 underline"
          onClick={withdraw}
        >
          Withdraw GPS consent
        </button>
      )}
    </main>
  );
}
