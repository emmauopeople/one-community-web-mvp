// server.js
import dotenv from "dotenv";
dotenv.config();
import app from "./src/app.js";
const PORT = process.env.PORT || 3000;
app.set("trust proxy", 1);

app.get("/healthz", (req, res) => res.status(200).json({ ok: true }));
app.get("/api/hello", (req, res) =>
  res.json({
    message: "Hello from 1community backend up 👋",
    env: process.env.NODE_ENV || "dev",
    time: new Date().toISOString(),
  }),
);

app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
