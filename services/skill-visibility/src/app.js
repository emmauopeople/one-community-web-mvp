import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import { sessionMiddleware } from "./middleware/session.js";
import adminRoutes from "./routes/admin.js";
import smartSearchRoutes from "./routes/smartSearch.js";
import skillsRoutes from "./routes/skills.js";
import eventsRoutes from "./routes/events.js";
import analyticsRoutes from "./routes/analytics.js";
import mediaRoutes from "./routes/media.js";
import contactRoutes from "./routes/contact.js";
import profileRoutes from "./routes/profile.js";
import metricsRoutes from "./routes/metrics.js";
import supportRoutes from "./routes/support.js";

const app = express();

app.use(helmet());
app.use("/metrics", metricsRoutes);

// Allow both production domains + localhost for development
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080').split(',').map(s => s.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(sessionMiddleware());

// Basic rate limit for auth endpoints (MVP)
app.use(
  "/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(healthRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(smartSearchRoutes);
app.use(skillsRoutes);
app.use("/events", eventsRoutes);
app.use(analyticsRoutes);
app.use(mediaRoutes);
app.use(contactRoutes);
app.use(supportRoutes);
app.use(profileRoutes);

app.get("/api/hello", (req, res) =>
  res.json({
    message: "Hello from 1community backend up 👋",
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
  }),
);

export default app;
