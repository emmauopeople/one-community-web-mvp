import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const mockQuery = jest.fn();
const mockPresignGet = jest.fn();
const mockLogEvent = jest.fn();

jest.unstable_mockModule("../../db.js", () => ({
  query: (...args) => mockQuery(...args),
}));

jest.unstable_mockModule("../../src/services/s3.js", () => ({
  presignGet: (...args) => mockPresignGet(...args),
}));

jest.unstable_mockModule("../../src/services/eventService.js", () => ({
  logEvent: (...args) => mockLogEvent(...args),
}));

const { default: skillsRouter } = await import("../../src/routes/skills.js");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = {}; // public routes read session optionally
    next();
  });
  app.use(skillsRouter);
  return app;
}

describe("Skills public routes", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPresignGet.mockReset();
    mockLogEvent.mockReset();
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_PRESIGN_EXPIRES_SECONDS = "300";
  });

  test("GET /skills/search returns results", async () => {
    // final query(sql, params) -> rows
    // attachIndexImages() also queries skill_media and calls presignGet
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, title: "Plumbing", lat: 1, lng: 2 }],
      }) // main search query
      .mockResolvedValueOnce({ rows: [{ skill_id: 1, s3_key: "k1" }] }); // attachIndexImages query

    mockPresignGet.mockResolvedValue("https://signed.example/img1");

    const app = makeApp();
    const res = await request(app).get("/skills/search?q=plumb&country=usa");

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0]).toEqual(
      expect.objectContaining({ indexImageUrl: "https://signed.example/img1" }),
    );
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "search" }),
    );
  });

  test("GET /skills/:id returns skill detail + media", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 10, title: "Tailor", provider_phone: "+12345678901" }],
      }) // skill row
      .mockResolvedValueOnce({
        rows: [
          {
            s3_key: "k1",
            mime_type: "image/jpeg",
            size_bytes: 123,
            sort_order: 0,
          },
        ],
      }); // media rows

    mockPresignGet.mockResolvedValue("https://signed.example/media1");

    const app = makeApp();
    const res = await request(app).get("/skills/10");

    expect(res.status).toBe(200);
    expect(res.body.skill.id).toBe(10);
    expect(res.body.media[0].url).toBe("https://signed.example/media1");
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "skill_view" }),
    );
  });

  test("GET /skills/:id -> 404 when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = makeApp();
    const res = await request(app).get("/skills/9999");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Skill not found/i);
  });
});
