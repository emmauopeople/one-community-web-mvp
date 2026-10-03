export const CONSENT_VERSION = "provider-gps-v1.2";
export const REGIONS = [
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
const clean = (value) => (typeof value === "string" ? value.trim() : "");

export function validateLocation(value, { fresh = false } = {}) {
  if (!value || typeof value !== "object")
    throw new Error("Capture and confirm your operating location.");
  const location = {};
  for (const key of ["region", "division", "subdivision", "city", "area"]) {
    location[key] = clean(value[key]);
    if (location[key].length > 120)
      throw new Error("Location fields must be 120 characters or fewer.");
  }
  if (
    !REGIONS.includes(location.region) ||
    !location.division ||
    !location.city ||
    !location.area
  )
    throw new Error(
      "Choose a Cameroon region and enter division, town/city and area.",
    );
  if (
    typeof value.lat !== "number" ||
    !Number.isFinite(value.lat) ||
    Math.abs(value.lat) > 90 ||
    typeof value.lng !== "number" ||
    !Number.isFinite(value.lng) ||
    Math.abs(value.lng) > 180
  )
    throw new Error("Valid captured latitude and longitude are required.");
  if (
    typeof value.accuracy !== "number" ||
    !Number.isFinite(value.accuracy) ||
    value.accuracy < 0
  )
    throw new Error("Location accuracy is required. Please retry capture.");
  const captured = Date.parse(value.capturedAt);
  if (
    !Number.isFinite(captured) ||
    captured > Date.now() + 60000 ||
    (fresh && captured < Date.now() - 30 * 60000)
  )
    throw new Error("Please capture your operating location again.");
  return {
    ...location,
    country: "Cameroon",
    lat: value.lat,
    lng: value.lng,
    accuracy: value.accuracy,
    capturedAt: new Date(captured).toISOString(),
    source: "gps_current_location",
  };
}

export function validateOnboarding(body) {
  if (body.gpsConsent !== true || body.consentVersion !== CONSENT_VERSION)
    throw new Error(
      "GPS-use consent is required to create a provider account.",
    );
  if (body.locationConfirmed !== true)
    throw new Error("Confirm that this is your operating location.");
  return validateLocation(body.operatingLocation, { fresh: true });
}

export function hasLocationConsent(provider) {
  return Boolean(
    provider?.gps_consent_at &&
    provider.gps_consent_version === CONSENT_VERSION &&
    !provider.gps_consent_withdrawn_at &&
    provider.operating_location,
  );
}
