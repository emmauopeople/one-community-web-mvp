import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const mockQuery = jest.fn();
const mockSendOtpEmail = jest.fn();
const mockLogAuthEvent = jest.fn();
const mockGetLoginAttempt = jest.fn();
const mockRecordLoginFailure = jest.fn();
const mockResetLoginAttempts = jest.fn();

jest.unstable_mockModule("../../db.js", () => ({
  query: (...args) => mockQuery(...args),
}));

jest.unstable_mockModule("../../src/services/emailService.js", () => ({
  sendOtpEmail: (...args) => mockSendOtpEmail(...args),
}));

jest.unstable_mockModule("../../src/services/authLogService.js", () => ({
  logAuthEvent: (...args) => mockLogAuthEvent(...args),
}));

jest.unstable_mockModule("../../src/services/loginAttemptService.js", () => ({
  getLoginAttempt: (...args) => mockGetLoginAttempt(...args),
  recordLoginFailure: (...args) => mockRecordLoginFailure(...args),
  resetLoginAttempts: (...args) => mockResetLoginAttempts(...args),
}));

// Keep OTP deterministic
jest.unstable_mockModule("../../src/services/otpService.js", () => ({
  generateOtp: () => "123456",
  hashOtp: (otp) => `hash:${otp}`,
}));

// bcrypt compare/hash behavior
jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: async () => "pwHash",
    compare: async (pw, hash) => pw === "Passw0rd!" && hash === "dbHash",
  },
}));

const { default: authRouter } = await import("../../src/routes/auth.js");

function makeApp() {
  const app = express();
  app.use(express.json());
  // minimal session object that auth routes mutate
  app.use((req, _res, next) => {
    req.session = {};
    next();
  });
  app.use(authRouter); // your file registers /auth/... inside router
  return app;
}

describe("Auth routes", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockSendOtpEmail.mockReset();
    mockLogAuthEvent.mockReset();
    mockGetLoginAttempt.mockReset();
    mockRecordLoginFailure.mockReset();
    mockResetLoginAttempts.mockReset();
  });

  test("POST /auth/provider/begin -> 200 and sends OTP", async () => {
    // existing email check: SELECT 1 FROM users ... -> rowCount 0
    // cleanup delete -> ok
    // upsert pending_registrations -> ok
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // existing user
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // cleanup delete
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // insert pending (any ok)

    const app = makeApp();
    const res = await request(app).post("/auth/provider/begin").send({
      email: "test@example.com",
      phone: "+12345678901",
      password: "Passw0rd!",
      method: "email",
      displayName: "Test Provider",
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockSendOtpEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      otp: "123456",
    });
  });

  test("POST /auth/provider/begin -> 409 if email exists", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{}] }); // existing user

    const app = makeApp();
    const res = await request(app).post("/auth/provider/begin").send({
      email: "test@example.com",
      phone: "+12345678901",
      password: "Passw0rd!",
      method: "email",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Email already registered/i);
    expect(mockSendOtpEmail).not.toHaveBeenCalled();
  });

  test("POST /auth/provider/complete -> 400 when no pending registration", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // SELECT pending -> none

    const app = makeApp();
    const res = await request(app).post("/auth/provider/complete").send({
      email: "test@example.com",
      otp: "123456",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No pending registration/i);
  });

  test("POST /auth/login -> 401 invalid credentials when user not found", async () => {
    mockGetLoginAttempt.mockResolvedValue(null);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // SELECT user -> none

    const app = makeApp();
    const res = await request(app).post("/auth/login").send({
      email: "missing@example.com",
      password: "whatever",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/i);
    expect(mockRecordLoginFailure).toHaveBeenCalled();
  });

  test("GET /auth/me -> returns session user or null", async () => {
    const app = makeApp();
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });
});
