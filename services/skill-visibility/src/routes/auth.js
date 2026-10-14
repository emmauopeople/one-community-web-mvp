import express from "express";
import bcrypt from "bcrypt";
import { query } from "../../db.js";
import { generateOtp, hashOtp } from "../services/otpService.js";
import { sendOtpEmail } from "../services/emailService.js";
import { logAuthEvent } from "../services/authLogService.js";
import {
  getLoginAttempt,
  recordLoginFailure,
  resetLoginAttempts,
} from "../services/loginAttemptService.js";

import {
  validateOnboarding,
  validateLocation,
  CONSENT_VERSION,
} from "../services/providerLocation.js";

const router = express.Router();

const OTP_EXPIRES_MIN = 15;
const OTP_MAX_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  // MVP email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/\s+/g, "");
}

function isValidPhone(phone) {
  // MVP E.164-ish: optional +, digits only, 8–15 digits
  return /^\+?\d{8,15}$/.test(phone);
}

// -------------------------
// Provider Registration BEGIN
// -------------------------
router.post("/auth/provider/begin", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || "");
    const method = String(req.body.method || "email").toLowerCase();
    const named = ["firstName", "lastName", "businessName"].some(
      (key) => key in req.body,
    );
    const firstName =
      typeof req.body.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName =
      typeof req.body.lastName === "string" ? req.body.lastName.trim() : "";
    const businessName =
      typeof req.body.businessName === "string"
        ? req.body.businessName.trim()
        : "";
    if (
      named &&
      (!firstName ||
        !lastName ||
        firstName.length > 60 ||
        lastName.length > 60 ||
        businessName.length > 60 ||
        (req.body.businessName !== undefined &&
          typeof req.body.businessName !== "string"))
    ) {
      return res
        .status(400)
        .json({
          error:
            "First and last name are required (up to 60 characters each). Business name is optional (up to 60 characters).",
        });
    }
    const displayName = named
      ? businessName || `${firstName} ${lastName}`.slice(0, 60)
      : String(req.body.displayName || "").trim();

    if (displayName && (displayName.length < 2 || displayName.length > 60)) {
      return res
        .status(400)
        .json({ error: "Display name must be 2–60 characters." });
    }

    if (
      !email ||
      !isValidEmail(email) ||
      !phone ||
      !isValidPhone(phone) ||
      password.length < 8
    ) {
      await logAuthEvent({
        email,
        eventType: "provider_register_begin",
        success: false,
        req,
        details: { reason: "invalid_input" },
      });
      return res.status(400).json({ error: "Invalid input" });
    }

    if (method !== "email") {
      return res
        .status(400)
        .json({ error: "Only email OTP is supported in MVP" });
    }

    let operatingLocation;
    try {
      operatingLocation = validateOnboarding(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Block duplicate emails early (avoid sending OTP for existing accounts)
    const existing = await query(`SELECT 1 FROM users WHERE email=$1 LIMIT 1`, [
      email,
    ]);
    if (existing.rowCount > 0) {
      await logAuthEvent({
        email,
        eventType: "provider_register_begin",
        success: false,
        req,
        details: { reason: "email_exists" },
      });
      return res
        .status(409)
        .json({ error: "Email already registered. Please login." });
    }

    // Cleanup expired pendings
    await query(
      `DELETE FROM pending_registrations WHERE otp_expires_at < NOW()`,
      [],
    );

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `INSERT INTO pending_registrations
     (email, phone, password_hash, otp_hash, otp_expires_at, attempts, resend_count, locked_until, display_name, operating_location, gps_consent_at, gps_consent_version, first_name, last_name, business_name)
   VALUES
     ($1, $2, $3, $4, NOW() + INTERVAL '${OTP_EXPIRES_MIN} minutes', 0, 0, NULL, $5, $6::jsonb, NOW(), $7, $8, $9, $10)
   ON CONFLICT (email)
   DO UPDATE SET
     phone=$2,
     password_hash=$3,
     otp_hash=$4,
     otp_expires_at=NOW() + INTERVAL '${OTP_EXPIRES_MIN} minutes',
     attempts=0,
     resend_count=0,
     locked_until=NULL,
     display_name=$5, operating_location=$6::jsonb, gps_consent_at=NOW(), gps_consent_version=$7,
     first_name=$8, last_name=$9, business_name=$10,
     updated_at=NOW()`,
      [
        email,
        phone,
        passwordHash,
        otpHash,
        displayName || null,
        JSON.stringify(operatingLocation),
        CONSENT_VERSION,
        firstName || null,
        lastName || null,
        businessName || null,
      ],
    );

    await sendOtpEmail({ to: email, otp });

    await logAuthEvent({
      email,
      eventType: "provider_register_begin",
      success: true,
      req,
    });

    return res.status(200).json({ ok: true, message: "OTP sent" });
  } catch (ex) {
    console.error("provider/begin failed", ex?.code || "unknown");
    return res.status(500).json({ error: "Failed to start registration" });
  }
});

// -------------------------
// Provider Registration COMPLETE
// -------------------------
router.post("/auth/provider/complete", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !isValidEmail(email) || !otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const pending = await query(
      `SELECT * FROM pending_registrations WHERE email=$1`,
      [email],
    );
    const row = pending.rows[0];

    if (!row) {
      await logAuthEvent({
        email,
        eventType: "provider_register_complete",
        success: false,
        req,
        details: { reason: "no_pending" },
      });
      return res.status(400).json({ error: "No pending registration found" });
    }

    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      return res
        .status(429)
        .json({ error: "Too many attempts. Try again later." });
    }

    if (new Date(row.otp_expires_at) < new Date()) {
      await query(`DELETE FROM pending_registrations WHERE email=$1`, [email]);
      await logAuthEvent({
        email,
        eventType: "provider_register_complete",
        success: false,
        req,
        details: { reason: "expired" },
      });
      return res
        .status(400)
        .json({ error: "OTP expired. Start registration again." });
    }

    const providedHash = hashOtp(otp);
    if (providedHash !== row.otp_hash) {
      const attempts = Number(row.attempts || 0) + 1;

      let lockedUntil = null;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await query(
        `UPDATE pending_registrations SET attempts=$2, locked_until=$3, updated_at=NOW() WHERE email=$1`,
        [email, attempts, lockedUntil],
      );

      await logAuthEvent({
        email,
        eventType: "provider_register_complete",
        success: false,
        req,
        details: { reason: "otp_mismatch", attempts },
      });

      return res.status(400).json({ error: "Invalid code" });
    }

    try {
      if (!row.gps_consent_at || row.gps_consent_version !== CONSENT_VERSION)
        throw new Error("GPS consent missing. Start registration again.");
      validateLocation(row.operating_location);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create provider user (race-safe)
    let created;
    try {
      const existing = await query(`SELECT 1 FROM users WHERE email=$1`, [
        email,
      ]);
      if (existing.rowCount > 0) {
        await query(`DELETE FROM pending_registrations WHERE email=$1`, [
          email,
        ]); // optional cleanup
        return res
          .status(409)
          .json({ error: "Email already registered. Please log in." });
      }
      //-----adding for dispay name----

      created = await query(
        `WITH pending AS (
          DELETE FROM pending_registrations WHERE email=$1 AND otp_hash=$2
            AND otp_expires_at > NOW() AND (locked_until IS NULL OR locked_until <= NOW()) AND gps_consent_at IS NOT NULL
            AND gps_consent_version=$3 AND operating_location=$4::jsonb
          RETURNING *
        ), created AS (
          INSERT INTO users (email, phone, password_hash, role, status, email_verified, display_name,
            operating_location, gps_consent_at, gps_consent_version, first_name, last_name, business_name)
          SELECT email,phone,password_hash,'provider','active',TRUE,display_name,
            operating_location,gps_consent_at,gps_consent_version,first_name,last_name,business_name FROM pending
          RETURNING id,email,role,status,display_name
        ), audit AS (
          INSERT INTO provider_location_audit(provider_id,action,consent_version)
          SELECT id,'accepted',$3 FROM created
        ) SELECT * FROM created`,
        [
          email,
          providedHash,
          CONSENT_VERSION,
          JSON.stringify(row.operating_location),
        ],
      );
    } catch (ex) {
      if (ex?.code === "23505" && ex?.constraint === "users_email_key") {
        await query(`DELETE FROM pending_registrations WHERE email=$1`, [
          email,
        ]);
        return res
          .status(409)
          .json({ error: "Email already registered. Please login." });
      }
      throw ex;
    }

    if (!created.rows.length)
      return res.status(409).json({
        error: "Registration changed or completed. Please sign in or restart.",
      });

    // ✅ Auto-login after registration (important for portal access)
    req.session.user = {
      id: created.rows[0].id,
      email: created.rows[0].email,
      role: created.rows[0].role,
    };

    await logAuthEvent({
      userId: created.rows[0].id,
      email,
      eventType: "provider_register_complete",
      success: true,
      req,
    });

    return res.status(201).json({ ok: true, user: created.rows[0] });
  } catch (ex) {
    console.error("provider/complete failed", ex?.code || "unknown");
    return res.status(500).json({ error: "Registration failed" });
  }
});

// -------------------------
// Login / Logout / Me
// -------------------------
router.post("/auth/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  const attempt = await getLoginAttempt(email);
  if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
    await logAuthEvent({
      email,
      eventType: "login",
      success: false,
      req,
      details: { reason: "locked" },
    });
    return res
      .status(429)
      .json({ error: "Too many failed attempts. Try again later." });
  }

  const u = await query(
    `SELECT id, email, role, status, password_hash FROM users WHERE email=$1`,
    [email],
  );
  const user = u.rows[0];

  if (!user) {
    await recordLoginFailure({ email, req });
    await logAuthEvent({
      email,
      eventType: "login",
      success: false,
      req,
      details: { reason: "invalid" },
    });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const result = await recordLoginFailure({ email, req });
    await logAuthEvent({
      userId: user.id,
      email,
      eventType: "login",
      success: false,
      req,
      details: { reason: "invalid", locked: result.locked },
    });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.status !== "active") {
    await logAuthEvent({
      userId: user.id,
      email,
      eventType: "login",
      success: false,
      req,
      details: { reason: "inactive" },
    });
    return res.status(403).json({ error: "Account inactive" });
  }

  await resetLoginAttempts(email);

  req.session.user = { id: user.id, email: user.email, role: user.role };
  await logAuthEvent({
    userId: user.id,
    email,
    eventType: "login",
    success: true,
    req,
  });

  return res.json({
    ok: true,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post("/auth/logout", async (req, res) => {
  const email = req.session?.user?.email || null;
  const userId = req.session?.user?.id || null;

  req.session = null;
  await logAuthEvent({
    userId,
    email,
    eventType: "logout",
    success: true,
    req,
  });
  return res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  return res.json({ user: req.session?.user || null });
});

export default router;
