import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { loadMigrations, applyMigrations } from "../scripts/migration-core.mjs";
const require = createRequire(
  new URL("../services/skill-visibility/package.json", import.meta.url),
);
const express = require("express"),
  request = require("supertest");
const publicDb = new URL("../services/skill-visibility/db.js", import.meta.url)
    .href,
  adminDb = new URL("../apps/admin-api/src/db/pool.js", import.meta.url).href;
registerHooks({
  load(url, ctx, next) {
    if (url === publicDb)
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export const query=(...args)=>globalThis.feedbackQuery(...args)",
      };
    if (url === adminDb)
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export default {query:(...args)=>globalThis.feedbackQuery(...args)}",
      };
    if (url.endsWith("/nodemailer/lib/nodemailer.js"))
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export default {createTransport:()=>({sendMail:(...args)=>globalThis.feedbackMail(...args)})}",
      };
    return next(url, ctx);
  },
});
test("feedback: anonymous privacy, validation, GPS, idempotency, moderation and consent-gated replies", async (t) => {
  const db = new PGlite({ extensions: { citext } });
  await db.waitReady;
  t.after(() => db.close());
  globalThis.feedbackQuery = async (sql, args) => {
    const r =
      !args && sql.includes(";")
        ? (await db.exec(sql)).at(-1)
        : await db.query(sql, args);
    return { ...r, rowCount: r.rows?.length || r.affectedRows || 0 };
  };
  await applyMigrations(
    { query: globalThis.feedbackQuery },
    await loadMigrations(
      fileURLToPath(new URL("../database/migrations", import.meta.url)),
    ),
  );
  await db.exec(
    "INSERT INTO admin_users(full_name,email,password_hash,role) VALUES('Admin','admin@fixture.test','fake','admin')",
  );
  let sent = 0,
    fail = false;
  globalThis.feedbackMail = async (m) => {
    assert.equal(m.to, "visitor@fixture.test");
    if (fail) throw Error("test");
    sent++;
  };
  process.env.SMTP_HOST = "mailpit";
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.headers["x-admin"]) req.session = { admin: { id: 1 } };
    next();
  });
  const { default: publicRoutes, validateFeedback } =
    await import("../services/skill-visibility/src/routes/feedback.js");
  app.use(publicRoutes);
  app.use(
    "/admin",
    (await import("../apps/admin-api/src/routes/feedbackRoutes.js")).default,
  );
  const base = {
    submissionId: randomUUID(),
    kind: "report",
    category: "app_problem",
    subject: "Images missing",
    description: "Images do not load on my phone.",
    contactConsent: false,
    email: "discard@fixture.test",
    useful: true,
    channel: "web",
    language: "fr",
    locationStatus: "captured",
    latitude: 4.123456,
    longitude: 9.654321,
  };
  for (const bad of [
    { category: "bad" },
    { subject: "a" },
    { description: "short" },
    { contactConsent: true, email: "" },
    { latitude: 91 },
    { latitude: "4" },
    { kind: "survey", useful: null },
    { channel: "other" },
    { locationStatus: "bad" },
    { contactConsent: "yes" },
  ])
    assert.equal(validateFeedback({ ...base, ...bad }), null);
  await request(app)
    .post("/feedback")
    .send({ ...base, subject: "a" })
    .expect(400);
  const response = await request(app).post("/feedback").send(base).expect(201);
  assert.deepEqual(response.body, { ok: true });
  await request(app).post("/feedback").send(base).expect(201);
  let rows = (await db.query("SELECT * FROM public_feedback")).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, null);
  assert.equal(Number(rows[0].latitude), 4.123);
  const denied = validateFeedback({ ...base, locationStatus: "denied" });
  assert.equal(denied[10], null);
  assert.equal(denied[11], null);
  const survey = {
    ...base,
    submissionId: randomUUID(),
    kind: "survey",
    category: null,
    subject: "",
    description: "",
    useful: false,
    channel: "mobile",
    locationStatus: "not_requested",
    contactConsent: true,
    email: "Visitor@fixture.test",
  };
  await request(app).post("/feedback").send(survey).expect(201);
  await request(app).get("/feedback").expect(404);
  await request(app).get("/admin/feedback").expect(401);
  await request(app).get("/admin/feedback/1/replies").expect(401);
  await request(app).post("/admin/feedback/1/replies").send({}).expect(401);
  const auth = (r) => r.set("x-admin", "1");
  let list = await auth(request(app).get("/admin/feedback")).expect(200);
  assert.equal(list.body.items.length, 2);
  assert(list.headers["cache-control"].includes("no-store"));
  await auth(request(app).get("/admin/feedback?kind=invalid")).expect(400);
  await auth(request(app).post("/admin/feedback/1/replies"))
    .send({ requestId: randomUUID(), body: "Hello" })
    .expect(409);
  assert.equal(sent, 0);
  const reply = {
    requestId: randomUUID(),
    body: "Thank you for your feedback.",
  };
  await auth(request(app).post("/admin/feedback/3/replies"))
    .send(reply)
    .expect(200);
  assert.equal(sent, 1);
  await auth(request(app).post("/admin/feedback/3/replies"))
    .send(reply)
    .expect(409);
  assert.equal(sent, 1);
  fail = true;
  await auth(request(app).post("/admin/feedback/3/replies"))
    .send({ ...reply, requestId: randomUUID() })
    .expect(502);
  const history = await auth(
    request(app).get("/admin/feedback/3/replies"),
  ).expect(200);
  assert.deepEqual(
    history.body.replies.map((r) => r.delivery_status),
    ["sent", "failed"],
  );
  await auth(request(app).patch("/admin/feedback/1"))
    .send({ status: "resolved" })
    .expect(200);
  assert.equal(
    (await db.query("SELECT status FROM public_feedback WHERE id=1")).rows[0]
      .status,
    "resolved",
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM audit_logs WHERE target_type='feedback'",
      )
    ).rows[0].n,
    3,
  );
  await db.exec("UPDATE admin_users SET is_active=false");
  await auth(request(app).get("/admin/feedback")).expect(403);
});
