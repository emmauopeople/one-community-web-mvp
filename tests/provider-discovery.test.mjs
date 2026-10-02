import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { loadMigrations, applyMigrations } from "../scripts/migration-core.mjs";
import { discoveryQuery } from "../services/skill-visibility/src/services/discoveryQuery.js";
import { validateOnboarding } from "../services/skill-visibility/src/services/providerLocation.js";
const require = createRequire(
  new URL("../services/skill-visibility/package.json", import.meta.url),
);
const express = require("express"),
  request = require("supertest"),
  cookieSession = require("cookie-session");
const dbUrl = new URL("../services/skill-visibility/db.js", import.meta.url)
  .href;
const mailUrl = new URL(
  "../services/skill-visibility/src/services/emailService.js",
  import.meta.url,
).href;
registerHooks({
  load(url, context, next) {
    if (url === dbUrl)
      return {
        format: "module",
        shortCircuit: true,
        source: "export const query=(...args)=>globalThis.__query(...args);",
      };
    if (url === mailUrl)
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export const sendOtpEmail=async message=>{globalThis.__otp=message.otp;}",
      };
    return next(url, context);
  },
});
process.env.OTP_SECRET = "only-used-by-tests";
const location = () => ({
  country: "Cameroon",
  region: "Littoral",
  division: "Wouri",
  subdivision: "Douala IV",
  city: "Douala",
  area: "Bonaberi",
  lat: 4.09,
  lng: 9.65,
  accuracy: 12,
  capturedAt: new Date().toISOString(),
});
const setup = () => ({
  gpsConsent: true,
  consentVersion: "provider-gps-v1.2",
  locationConfirmed: true,
  operatingLocation: location(),
});

test("invalid or partial search location is rejected instead of falling back silently", () => {
  for (const input of [
    { lat: "4" },
    { lat: "", lng: "9" },
    { lat: "91", lng: "9" },
    { lat: "4", lng: "Infinity" },
    { radius_km: "101" },
    { page: "1.5" },
  ])
    assert.throws(() => discoveryQuery(input));
  assert.equal(discoveryQuery({ lat: "0", lng: "0" }).hasGeo, true);
});
test("onboarding requires explicit current consent, confirmation and valid capture", () => {
  const good = setup();
  assert.equal(validateOnboarding(good).city, "Douala");
  for (const patch of [
    { gpsConsent: false },
    { gpsConsent: "true" },
    { consentVersion: "old" },
    { locationConfirmed: false },
    { operatingLocation: { ...location(), lat: null } },
    { operatingLocation: { ...location(), lng: 181 } },
    { operatingLocation: { ...location(), capturedAt: "2000-01-01" } },
  ])
    assert.throws(() => validateOnboarding({ ...good, ...patch }));
});
test("real routes and PostgreSQL: consent, OTP, inheritance, discovery and withdrawal", async (t) => {
  const db = new PGlite({ extensions: { citext } });
  await db.waitReady;
  t.after(() => db.close());
  globalThis.__query = async (sql, params) => {
    const result =
      !params && sql.includes(";")
        ? (await db.exec(sql)).at(-1)
        : await db.query(sql, params);
    return {
      ...result,
      rowCount: result.rows?.length || result.affectedRows || 0,
    };
  };
  const migrations = await loadMigrations(
    fileURLToPath(new URL("../database/migrations", import.meta.url)),
  );
  await applyMigrations({ query: globalThis.__query }, migrations);
  const app = express();
  app.use(express.json());
  app.use(cookieSession({ name: "test", keys: ["test-only"], httpOnly: true }));
  for (const name of ["auth", "profile", "smartSearch", "skills"])
    app.use(
      (await import(`../services/skill-visibility/src/routes/${name}.js`))
        .default,
    );
  const agent = request.agent(app);
  const credentials = {
    email: "new@example.test",
    phone: "+237600000001",
    password: "Test-only-long-pass",
    displayName: "New provider",
  };
  await t.test(
    "missing consent creates neither account nor pending registration",
    async () => {
      const denied = await agent.post("/auth/provider/begin").send(credentials);
      assert.equal(denied.status, 400);
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM pending_registrations"))
          .rows[0].n,
        0,
      );
    },
  );
  await t.test(
    "legacy pending verification cannot bypass location consent",
    async () => {
      await db.query(
        "INSERT INTO pending_registrations(email,phone,password_hash,otp_hash,otp_expires_at) VALUES('legacy@example.test','123','fake','fake',now()+interval '10 minutes')",
      );
      const { hashOtp } =
        await import("../services/skill-visibility/src/services/otpService.js");
      await db.query(
        "UPDATE pending_registrations SET otp_hash=$1 WHERE email='legacy@example.test'",
        [hashOtp("123456")],
      );
      const result = await agent
        .post("/auth/provider/complete")
        .send({ email: "legacy@example.test", otp: "123456" });
      assert.equal(result.status, 400);
      assert.match(result.body.error, /consent/i);
    },
  );
  await t.test('structured names are validated before registration', async () => {
    for (const names of [{firstName:'',lastName:'Doe'}, {firstName:'Jane'}, {firstName:'Jane',lastName:'Doe',businessName:[]}, {firstName:'A'.repeat(61),lastName:'Doe'}]) {
      const response=await agent.post('/auth/provider/begin').send({...credentials,...setup(),...names});
      assert.equal(response.status,400);
    }
  });
  await t.test(
    "valid onboarding completes once with an audit trail and login session",
    async () => {
      const begin = await agent
        .post("/auth/provider/begin")
        .send({ ...credentials, ...setup(), firstName:"Jane", lastName:"Doe", businessName:"Jane Services" });
      assert.equal(begin.status, 200, JSON.stringify(begin.body));
      const complete = await agent
        .post("/auth/provider/complete")
        .send({ email: credentials.email, otp: globalThis.__otp });
      assert.equal(complete.status, 201, JSON.stringify(complete.body));
      const saved=(await db.query('SELECT first_name,last_name,business_name,display_name FROM users WHERE email=$1',[credentials.email])).rows[0];
      assert.deepEqual(saved,{first_name:'Jane',last_name:'Doe',business_name:'Jane Services',display_name:'Jane Services'});
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM provider_location_audit",
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await agent
            .post("/auth/provider/complete")
            .send({ email: credentials.email, otp: globalThis.__otp })
        ).status,
        400,
      );
    },
  );
  let skillId;
  await t.test(
    "new skills inherit profile location even if unrequested client GPS differs",
    async () => {
      const result = await agent
        .post("/provider/skills")
        .send({
          title: "Local plumbing",
          category: "plumbing",
          description: "Test fixture service",
          lat: 80,
          lng: 80,
        });
      assert.equal(result.status, 201, JSON.stringify(result.body));
      skillId = result.body.skill.id;
      assert.equal(result.body.skill.lat, 4.09);
      assert.equal(result.body.skill.area, "Bonaberi");
    },
  );
  await t.test(
    "profile updates do not silently relocate an existing listing",
    async () => {
      const updated = await agent
        .put("/provider/location")
        .send({ ...setup(), operatingLocation: { ...location(), lat: 4.12 } });
      assert.equal(updated.status, 200);
      assert.equal(
        (await db.query("SELECT lat FROM skills WHERE id=$1", [skillId]))
          .rows[0].lat,
        4.09,
      );
    },
  );
  await t.test(
    "nearby sorting, paging, radius and privacy work against real SQL",
    async () => {
      for (let i = 0; i < 14; i++)
        await agent
          .post("/provider/skills")
          .send({
            title: `Plumbing ${i}`,
            category: "plumbing",
            description: "Another synthetic fixture",
          });
      const first = await agent.get(
        "/skills/search?lat=4.09&lng=9.65&radius_km=20",
      );
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(first.body.results.length, 12);
      assert.equal(first.body.hasMore, true);
      assert.equal(first.body.results[0].id, skillId);
      assert.equal(first.body.results[0].distance_km, 0);
      assert.equal("lat" in first.body.results[0], false);
      const second = await agent.get("/skills/search?lat=4.09&lng=9.65&page=2");
      assert.equal(second.body.results.length, 3);
      assert.equal(
        second.body.results.some((s) =>
          first.body.results.some((f) => f.id === s.id),
        ),
        false,
      );
      const far = await agent.get("/skills/search?lat=0&lng=0");
      assert.equal(far.body.results.length, 0);
      const detail = await agent.get("/skills/" + skillId);
      assert.equal(detail.status, 200);
      assert.equal("lat" in detail.body.skill, false);
      const events = (
        await db.query(
          "SELECT lat,lng,result_count,search_mode FROM events WHERE event_type='search' ORDER BY id",
        )
      ).rows;
      assert.ok(events.every((e) => e.lat === null && e.lng === null));
      assert.equal(events.length, 2, 'Loading page 2 must not count as another search');
      assert.equal(events[0].result_count, 12);
      assert.equal(events[0].search_mode, "nearby");
    },
  );
  await t.test("French search finds English categories and records language without GPS", async () => {
    const french=await agent.get('/skills/search?q=plombier').set('Accept-Language','fr');
    assert.equal(french.status,200);assert.equal(french.body.results.length,12);
    assert(french.body.results.every(s=>s.category==='plumbing'));
    const latest=(await db.query("SELECT language,lat,lng FROM events WHERE event_type='search' ORDER BY id DESC LIMIT 1")).rows[0];
    assert.equal(latest.language,'fr');assert.equal(latest.lat,null);assert.equal(latest.lng,null);
  });
  await t.test(
    "withdrawal hides public records and blocks creation without blocking account access",
    async () => {
      assert.equal(
        (await agent.delete("/provider/location/consent")).status,
        200,
      );
      assert.equal((await agent.get("/skills/search")).body.results.length, 0);
      assert.equal((await agent.get("/skills/" + skillId)).status, 404);
      assert.equal((await agent.get("/provider/profile")).status, 200);
      assert.equal(
        (
          await agent
            .post("/provider/skills")
            .send({
              title: "Blocked",
              category: "plumbing",
              description: "Test",
            })
        ).status,
        403,
      );
    },
  );
});
