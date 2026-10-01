import test from "node:test";
import assert from "node:assert/strict";
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
  .href;
const adminDb = new URL("../apps/admin-api/src/db/pool.js", import.meta.url)
  .href;
registerHooks({
  load(url, context, next) {
    if (url === publicDb)
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export const query=(...args)=>globalThis.__reviewQuery(...args);",
      };
    if (url === adminDb)
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export default {query:(...args)=>globalThis.__reviewQuery(...args)};",
      };
    return next(url, context);
  },
});
test("moderated reviews: privacy, authorization, lifecycle and atomic audit", async (t) => {
  const db = new PGlite({ extensions: { citext } });
  await db.waitReady;
  t.after(() => db.close());
  globalThis.__reviewQuery = async (sql, params) => {
    const result =
      !params && sql.includes(";")
        ? (await db.exec(sql)).at(-1)
        : await db.query(sql, params);
    return {
      ...result,
      rowCount: result.rows?.length || result.affectedRows || 0,
    };
  };
  await applyMigrations(
    { query: globalThis.__reviewQuery },
    await loadMigrations(
      fileURLToPath(new URL("../database/migrations", import.meta.url)),
    ),
  );
  await db.exec(
    "INSERT INTO users(email,phone,password_hash,role,display_name,gps_consent_at,gps_consent_version) VALUES('provider@fixture.test','123','test','provider','Provider',now(),'provider-gps-v1.2'); INSERT INTO admin_users(full_name,email,password_hash,role) VALUES('Moderator','admin@fixture.test','test','admin'); INSERT INTO skills(provider_id,title,category,description,country,city,lat,lng) VALUES(1,'Plumbing','plumbing','Fixture','Cameroon','Douala',4,9)",
  );
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.headers["x-test-admin"])
      req.session = { admin: { id: Number(req.headers["x-test-admin"]) } };
    next();
  });
  app.use(
    (await import("../services/skill-visibility/src/routes/reviews.js"))
      .default,
  );
  app.use(
    "/api/admin",
    (await import("../apps/admin-api/src/routes/reviewRoutes.js")).default,
  );
  const payload = {
    name: "Visitor",
    email: "visitor@fixture.test",
    rating: 5,
    body: "Helpful and reliable plumbing work at our home.",
    publicationConsent: true,
    skillId: 1,
  };
  const admin = () =>
    request(app).patch("/api/admin/reviews/1").set("x-test-admin", "1");
  const publicRead = () => request(app).get("/providers/1/reviews");
  await t.test(
    "reject invalid input, consent and mismatched services",
    async () => {
      for (const patch of [
        { rating: 6 },
        { rating: "5" },
        { rating: 2.5 },
        { body: "short" },
        { publicationConsent: false },
        { name: " " },
        { email: "bad" },
      ])
        assert.equal(
          (
            await request(app)
              .post("/providers/1/reviews")
              .send({ ...payload, ...patch })
          ).status,
          400,
        );
      assert.equal(
        (
          await request(app)
            .post("/providers/1/reviews")
            .send({ ...payload, skillId: 999 })
        ).status,
        404,
      );
    },
  );
  await t.test(
    "client cannot self-approve; pending fields stay private",
    async () => {
      const response = await request(app)
        .post("/providers/1/reviews")
        .send({ ...payload, status: "approved", verified: true });
      assert.equal(response.status, 202);
      const read = await publicRead();
      assert.deepEqual(read.body.reviews, []);
      assert.deepEqual(read.body.summary, { count: 0, average: null });
      assert.equal(
        (await db.query("SELECT status FROM provider_reviews")).rows[0].status,
        "pending",
      );
      assert.equal(
        (
          await request(app)
            .post("/providers/1/reviews")
            .send({ ...payload, email: "VISITOR@fixture.test" })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "anonymous/inactive admin denied and approval requires verification",
    async () => {
      assert.equal((await request(app).get("/api/admin/reviews")).status, 401);
      assert.equal(
        (
          await request(app).patch("/api/admin/reviews/1").send({
            status: "approved",
            version: 1,
            notes: "checked",
            verified: true,
          })
        ).status,
        401,
      );
      await db.exec("UPDATE admin_users SET is_active=false WHERE id=1");
      assert.equal(
        (await request(app).get("/api/admin/reviews").set("x-test-admin", "1"))
          .status,
        403,
      );
      await db.exec("UPDATE admin_users SET is_active=true WHERE id=1");
      assert.equal(
        (
          await admin().send({
            status: "approved",
            version: 1,
            notes: "Contacted reviewer",
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "approved-only totals and public allowlist exclude contact and notes",
    async () => {
      const queue = await request(app)
        .get("/api/admin/reviews")
        .set("x-test-admin", "1");
      assert.equal(queue.body.reviews[0].reviewer_email, payload.email);
      assert.equal(
        (
          await admin().send({
            status: "approved",
            version: 1,
            notes: "Contacted reviewer and checked experience",
            verified: true,
          })
        ).status,
        200,
      );
      const read = await publicRead();
      assert.equal(read.body.reviews.length, 1);
      assert.deepEqual(read.body.summary, { count: 1, average: 5 });
      assert.deepEqual(
        Object.keys(read.body.reviews[0]).sort(),
        [
          "id",
          "reviewer_name",
          "rating",
          "body",
          "approved_at",
          "skill_id",
        ].sort(),
      );
      assert(!JSON.stringify(read.body).includes(payload.email));
      assert(!JSON.stringify(read.body).includes("Contacted reviewer"));
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM audit_logs WHERE action_type='review_moderation'",
          )
        ).rows[0].n,
        1,
      );
    },
  );
  await t.test(
    "stale moderator decision conflicts and failed audit rolls back publication",
    async () => {
      assert.equal(
        (
          await admin().send({
            status: "rejected",
            version: 1,
            notes: "Outdated moderator decision",
          })
        ).status,
        409,
      );
      await db.exec(
        "ALTER TABLE audit_logs ADD CONSTRAINT fail_review_audit CHECK(action_type<>'review_moderation') NOT VALID",
      );
      assert.equal(
        (
          await admin().send({
            status: "rejected",
            version: 2,
            notes: "Must fail atomically",
          })
        ).status,
        500,
      );
      assert.equal(
        (await db.query("SELECT status FROM provider_reviews WHERE id=1"))
          .rows[0].status,
        "approved",
      );
      await db.exec("ALTER TABLE audit_logs DROP CONSTRAINT fail_review_audit");
    },
  );
  await t.test(
    "unpublish and reject remove reviews and totals immediately",
    async () => {
      assert.equal(
        (
          await admin().send({
            status: "pending",
            version: 2,
            notes: "Rechecking new information",
          })
        ).status,
        200,
      );
      assert.equal((await publicRead()).body.summary.count, 0);
      assert.equal(
        (
          await admin().send({
            status: "rejected",
            version: 3,
            notes: "Unable to verify experience",
          })
        ).status,
        200,
      );
      assert.equal((await publicRead()).body.reviews.length, 0);
    },
  );
  await t.test(
    "inactive, soft-delete and restore retain content and never bypass approval",
    async () => {
      let version = 4;
      const decide = async (status, verified = false) =>
        admin().send({
          status,
          version,
          verified,
          notes: "Verified lifecycle test action",
        });
      assert.equal((await decide("approved", true)).status, 200);
      version++;
      assert.equal((await publicRead()).body.summary.count, 1);
      assert.equal((await decide("inactive")).status, 200);
      version++;
      assert.equal((await publicRead()).body.summary.count, 0);
      assert.equal((await decide("deleted")).status, 200);
      version++;
      const row = (await db.query("SELECT * FROM provider_reviews WHERE id=1"))
        .rows[0];
      assert.equal(row.body, payload.body);
      assert(row.deleted_at);
      assert.equal(Number(row.deleted_by), 1);
      const queue = await request(app)
        .get("/api/admin/reviews?status=deleted")
        .set("x-test-admin", "1");
      assert.equal(queue.body.reviews.length, 1);
      assert.equal(queue.body.counts.deleted, 1);
      assert.equal((await publicRead()).body.reviews.length, 0);
      assert.equal((await decide("approved", true)).status, 409);
      assert.equal((await decide("inactive")).status, 409);
      assert.equal((await decide("pending")).status, 200);
      version++;
      const restored = (
        await db.query("SELECT * FROM provider_reviews WHERE id=1")
      ).rows[0];
      assert.equal(restored.deleted_at, null);
      assert.equal(restored.deleted_by, null);
      assert.equal((await decide("approved")).status, 400);
      assert.equal((await publicRead()).body.summary.count, 0);
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM audit_logs WHERE details->>'status'='deleted'",
          )
        ).rows[0].n,
        1,
      );
    },
  );
  await t.test(
    "pagination, unpublished filtering and provider consent gate",
    async () => {
      await db.exec(
        "INSERT INTO provider_reviews(provider_id,reviewer_name,reviewer_email,rating,body,status,approved_at) SELECT 1,'Reviewer','fixture'||n||'@example.test',4,'Test review with enough characters','approved',now() FROM generate_series(1,12) n",
      );
      const first = await publicRead(),
        second = await request(app).get("/providers/1/reviews?page=2");
      assert.equal(first.body.reviews.length, 10);
      assert.equal(first.body.hasMore, true);
      assert.equal(second.body.reviews.length, 2);
      assert.equal(second.body.hasMore, false);
      assert.equal(first.body.summary.count, 12);
      assert.equal(first.body.summary.average, 4);
      assert.equal(
        (await request(app).get("/providers/1/reviews?page=0")).status,
        400,
      );
      await db.exec(
        "UPDATE users SET gps_consent_withdrawn_at=now() WHERE id=1",
      );
      assert.equal((await publicRead()).status, 404);
      assert.equal(
        (
          await request(app)
            .post("/providers/1/reviews")
            .send({ ...payload, email: "another@example.test" })
        ).status,
        404,
      );
    },
  );
});
