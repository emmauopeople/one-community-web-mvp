import { generateOtp, hashOtp } from "../../src/services/otpService.js";

describe("otpService", () => {
  test("generateOtp returns 6 digits", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  test("hashOtp is deterministic for same otp+secret", () => {
    process.env.OTP_SECRET = "abc";
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
  });

  test("hashOtp changes with different otp", () => {
    process.env.OTP_SECRET = "abc";
    expect(hashOtp("123456")).not.toBe(hashOtp("000000"));
  });
});
