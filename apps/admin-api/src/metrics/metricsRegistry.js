import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const adminLoginSuccessTotal = new client.Counter({
  name: "admin_login_success_total",
  help: "Total number of successful admin logins",
  registers: [register],
});

export const adminLoginFailureTotal = new client.Counter({
  name: "admin_login_failure_total",
  help: "Total number of failed admin logins",
  registers: [register],
});

export const providerStatusChangesTotal = new client.Counter({
  name: "provider_status_changes_total",
  help: "Total number of provider status changes made by admins",
  registers: [register],
});

export const requestUpdatesTotal = new client.Counter({
  name: "request_updates_total",
  help: "Total number of provider request updates made by admins",
  registers: [register],
});

export const requestNotesAddedTotal = new client.Counter({
  name: "request_notes_added_total",
  help: "Total number of request notes added by admins",
  registers: [register],
});

export const skillUpdatesTotal = new client.Counter({
  name: "skill_updates_total",
  help: "Total number of skill updates made by admins",
  registers: [register],
});

export default register;
