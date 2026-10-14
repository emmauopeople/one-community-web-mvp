import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const mockLogEvent = jest.fn();

jest.unstable_mockModule("../../src/services/eventService.js", () => ({
  logEvent: (...args) => mockLogEvent(...args),
}));

const { default: eventsRouter } = await import("../../src/routes/events.js");

function makeApp() {
  const app = express();
  app.use(express.json());
  // minimal session stub (your code reads req.session?.user?.id)
  app.use((req, _res, next) => {
    req.session = { user: { id: 99, email: "t@t.com", role: "provider" } };
    next();
  });
  app.use("/events", eventsRouter);
  return app;
}

describe("POST /events", () => {
  beforeEach(() => mockLogEvent.mockReset());

  test("200 ok for allowed eventType", async () => {
    const app = makeApp();

    const res = await request(app)
      .post("/events")
      .send({ eventType: "skill_view", meta: { skillId: 10 } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        eventType: "skill_view",
        userId: 99,
        meta: { skillId: 10 },
      }),
    );
  });

  test("400 for invalid eventType", async () => {
    const app = makeApp();

    const res = await request(app)
      .post("/events")
      .send({ eventType: "not_allowed", meta: {} });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid eventType" });
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test("meta defaults to {} if missing/invalid", async () => {
    const app = makeApp();

    const res = await request(app)
      .post("/events")
      .send({ eventType: "search", meta: "bad" });

    expect(res.status).toBe(200);
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ meta: {} }),
    );
  });
});
