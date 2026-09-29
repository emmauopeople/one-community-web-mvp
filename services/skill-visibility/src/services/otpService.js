import crypto from "crypto";

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(otp) {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error("OTP_SECRET is required");
  return crypto
    .createHash("sha256")
    .update(`${secret}:${String(otp)}`)
    .digest("hex");
}
