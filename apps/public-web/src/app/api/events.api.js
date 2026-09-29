import { api } from "./client";

export const eventsApi = {
  // Best-effort: never block the UI if logging fails
  track: async (eventType, meta = {}) => {
    try {
      await api.post("/events", {
        eventType,
        meta,
      });
    } catch {
      // ignore
    }
  },
};
