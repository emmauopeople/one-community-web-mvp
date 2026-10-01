// backend/src/routes/media.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { presignGet, uploadBufferToS3, deleteStorageObject } from "../services/s3.js";
import { logEvent } from "../services/eventService.js";

import { randomUUID } from "node:crypto";
import { optimizeImage, InvalidImage } from "../services/imageOptimization.js";

const router = express.Router();

const BUCKET = process.env.S3_BUCKET;
const PREFIX = process.env.S3_PREFIX_SKILLS || "skills";
const EXPIRES = Number(process.env.S3_PRESIGN_EXPIRES_SECONDS || 300);
const MAX_BYTES = Number(process.env.S3_MAX_IMAGE_BYTES || 3145728);

const ALLOWED_MIME = new Set(
  String(process.env.S3_ALLOWED_IMAGE_MIME || "image/jpeg,image/png,image/webp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

function normalizeUploadMime(mime, filename = "") {
  const cleanMime = String(mime || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  if (cleanMime === "image/jpg") return "image/jpeg";
  if (cleanMime === "image/jpeg") return "image/jpeg";
  if (cleanMime === "image/png") return "image/png";
  if (cleanMime === "image/webp") return "image/webp";

  const name = String(filename || "").toLowerCase();

  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";

  return cleanMime;
}

function parseSortOrders(raw, fileCount) {
  if (!raw) return Array.from({ length: fileCount }, (_, i) => i);

  let parsed;

  if (Array.isArray(raw)) {
    parsed = raw;
  } else {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = String(raw)
        .split(",")
        .map((x) => x.trim());
    }
  }

  if (!Array.isArray(parsed) || parsed.length !== fileCount) {
    return null;
  }

  return parsed.map((x) => Number(x));
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 3,
  },
});

function uploadSkillImages(req, res, next) {
  memoryUpload.array("images", 3)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: err.message || "Invalid image upload",
      });
    }

    return next();
  });
}

async function providerMustBeActive(providerId) {
  const r = await query(
    `SELECT status FROM users WHERE id=$1 AND role='provider'`,
    [providerId],
  );

  const u = r.rows[0];

  if (!u) return { ok: false, code: 404, error: "Provider not found" };

  if (u.status !== "active") {
    return { ok: false, code: 403, error: "Provider is inactive" };
  }

  return { ok: true };
}

async function getOwnedSkill({ skillId, providerId }) {
  const r = await query(
    `SELECT id, provider_id, status
     FROM skills
     WHERE id=$1 AND provider_id=$2`,
    [skillId, providerId],
  );

  return r.rows[0] || null;
}

// All new images must pass through validation and optimization on the API.
for (const action of ['presign', 'confirm']) {
  router.post(`/media/skills/:skillId/${action}`, requireAuth, requireRole('provider'), (_req, res) =>
    res.status(410).json({ error: 'Please use the image uploader to upload optimized images.' }));
}

router.post('/media/skills/:skillId/upload-direct', requireAuth, requireRole('provider'), uploadSkillImages, async (req, res) => {
  const uploadedKeys = [];
  let databaseStarted = false;
  try {
    if (!BUCKET) return res.status(503).json({error:'Image storage is not configured.'});
    const providerId = req.session.user.id;
    const gate = await providerMustBeActive(providerId);
    if (!gate.ok) return res.status(gate.code).json({error:gate.error});
    const skillId = Number(req.params.skillId);
    if (!Number.isSafeInteger(skillId) || skillId <= 0) return res.status(400).json({error:'Invalid skill id'});
    const skill = await getOwnedSkill({skillId,providerId});
    if (!skill) return res.status(404).json({error:'Skill not found'});
    if (skill.status !== 'active') return res.status(403).json({error:'Skill is inactive'});
    const files = req.files || [];
    if (!files.length) return res.status(400).json({error:'No images uploaded'});
    const orders = parseSortOrders(req.body.sortOrders, files.length);
    if (!orders || new Set(orders).size !== orders.length || orders.some(n=>![0,1,2].includes(n)))
      return res.status(400).json({error:'Choose distinct image slots from 0 to 2.'});
    // Validate the entire batch before writing any objects.
    const items = [];
    for (let i=0; i<files.length; i++) {
      const file = files[i];
      if (!ALLOWED_MIME.has(normalizeUploadMime(file.mimetype,file.originalname))) throw new InvalidImage('Choose a non-animated JPEG, PNG or WebP image.');
      const variants = await optimizeImage(file.buffer);
      const base = `${PREFIX}/${providerId}/${skillId}/${randomUUID()}`;
      items.push({sort_order:orders[i],s3_key:`${base}.webp`,thumbnail_s3_key:`${base}.thumb.webp`,
        size_bytes:variants.detail.buffer.length,thumbnail_size_bytes:variants.thumbnail.buffer.length,variants});
    }
    for (const item of items) {
      for (const [key,buffer] of [[item.s3_key,item.variants.detail.buffer],[item.thumbnail_s3_key,item.variants.thumbnail.buffer]]) {
        uploadedKeys.push(key);
        await uploadBufferToS3({bucket:BUCKET,key,buffer,contentType:'image/webp'});
      }
    }
    // One SQL statement is atomic; BEGIN/COMMIT through pooled query() was unsafe.
    databaseStarted = true;
    const saved = await query(`INSERT INTO skill_media
      (skill_id,provider_id,media_type,bucket,s3_key,mime_type,size_bytes,sort_order,thumbnail_s3_key,thumbnail_size_bytes,updated_at)
      SELECT $1,$2,'image',$3,x.s3_key,'image/webp',x.size_bytes,x.sort_order,x.thumbnail_s3_key,x.thumbnail_size_bytes,NOW()
      FROM jsonb_to_recordset($4::jsonb) AS x(s3_key text,size_bytes bigint,sort_order int,thumbnail_s3_key text,thumbnail_size_bytes bigint)
      WHERE EXISTS (SELECT 1 FROM skills s JOIN users u ON u.id=s.provider_id WHERE s.id=$1 AND s.provider_id=$2 AND s.status='active' AND u.status='active')
      ON CONFLICT (skill_id,sort_order) DO UPDATE SET bucket=EXCLUDED.bucket,s3_key=EXCLUDED.s3_key,
      mime_type=EXCLUDED.mime_type,size_bytes=EXCLUDED.size_bytes,thumbnail_s3_key=EXCLUDED.thumbnail_s3_key,
      thumbnail_size_bytes=EXCLUDED.thumbnail_size_bytes,updated_at=NOW() RETURNING id`,
      [skillId,providerId,BUCKET,JSON.stringify(items.map(({variants,...item})=>item))]);
    if (saved.rows.length !== items.length) {
      databaseStarted = false;
      throw new Error('Listing changed during upload');
    }
    const rows = await query('SELECT id,s3_key,mime_type,size_bytes,sort_order FROM skill_media WHERE skill_id=$1 ORDER BY sort_order',[skillId]);
    const media = [];
    for (const row of rows.rows) media.push({id:row.id,sortOrder:row.sort_order,mimeType:row.mime_type,sizeBytes:Number(row.size_bytes),
      url:await presignGet({bucket:BUCKET,key:row.s3_key,expiresIn:EXPIRES})});
    try { await logEvent({req,eventType:'media_confirm',userId:providerId,meta:{skillId,count:items.length,uploadMode:'optimized'}}); } catch {}
    return res.json({ok:true,media});
  } catch (error) {
    // If DB commit status is unknown, retain objects for reconciliation instead of risking broken references.
    if (!databaseStarted) for (const key of uploadedKeys) {
      try { await deleteStorageObject({bucket:BUCKET,key}); } catch { console.error('Image cleanup failed; storage reconciliation required.'); }
    }
    return res.status(error instanceof InvalidImage ? 400 : 500).json({error:error instanceof InvalidImage ? error.message : 'Failed to upload images'});
  }
});
export default router;
