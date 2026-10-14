import bcrypt from "bcrypt";
import { query } from "../db.js";
import "dotenv/config";

(async () => {
  const email = (process.env.ROOT_ADMIN_EMAIL || " ").trim().toLowerCase();
  const password = process.env.ROOT_ADMIN_PASSWORD || " ";

  if (!email || password.length < 10) {
    console.error(
      "ROOT_ADMIN_EMAIL missing or ROOT_ADMIN_PASSWORD too short (min 10).",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (email, phone, password_hash, role, status, email_verified)
     VALUES ($1, $2, $3, 'admin', 'active', TRUE)
     ON CONFLICT (email) DO NOTHING`,
    [email, "N/A", passwordHash],
  );

  console.log("✅ Root admin ensured:", email);
  process.exit(0);
})();
