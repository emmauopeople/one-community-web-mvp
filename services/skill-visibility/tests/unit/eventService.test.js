import { jest } from "@jest/globals";
const mockQuery = jest.fn();

jest.unstable_mockModule("../../db.js", () => ({
  query: (...args) => mockQuery(...args),
}));

const { logEvent } = await import("../../src/services/eventService.js");

function fakeReq() {
  return {
    headers: { "user-agent": "jest", "x-forwarded-for": "1.2.3.4" },
    socket: { remoteAddress: "9.9.9.9" },
  };
}

describe("eventService.logEvent", () => {
  beforeEach(() => mockQuery.mockReset());

  test("dedupes skill_view within 5 seconds for same user+skill", async () => {
    // existing row found -> should return without insert
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await logEvent({
      req: fakeReq(),
      eventType: "skill_view",
      userId: 5,
      meta: { skillId: 10 },
    });

    expect(mockQuery).toHaveBeenCalledTimes(1); // only SELECT, no INSERT
  });

  test("inserts event when no dedupe match", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // SELECT existing none
      .mockResolvedValueOnce({}); // INSERT ok

    await logEvent({
      req: fakeReq(),
      eventType: "skill_view",
      userId: 5,
      meta: { skillId: 10, city: "OKC" },
    });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [sql] = mockQuery.mock.calls[1];
    expect(sql.toLowerCase()).toContain("insert into events");
  });
});
