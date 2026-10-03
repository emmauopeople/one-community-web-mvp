import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import reviewRoutes from "./routes/reviewRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import pool from "./db/pool.js";
import providerRoutes from "./routes/providerRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import monitoringRoutes from "./routes/monitoringRoutes.js";
import adminManagementRoutes from "./routes/adminManagementRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

const app = express();

app.set("trust proxy", 1);

const PgSession = connectPgSimple(session);

app.use(helmet());

app.use(
  cors({
    origin: process.env.ADMIN_FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "admin_sessions",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use("/api/admin", healthRoutes);
app.use("/api/admin", authRoutes);
app.use("/api/admin", dashboardRoutes);
app.use("/api/admin", providerRoutes);
app.use("/api/admin", requestRoutes);
app.use("/api/admin", skillRoutes);
app.use("/", metricsRoutes);
app.use("/api/admin", monitoringRoutes);
app.use("/api/admin", adminManagementRoutes);
app.use("/api/admin", analyticsRoutes);

app.use("/api/admin",reviewRoutes);

export default app;
