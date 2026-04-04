import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import compoundRoutes from "./routes/compoundRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import navigationRoutes from "./routes/navigationRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const applicationsUploadDir = path.join(__dirname, "uploads", "applications");
fs.mkdirSync(applicationsUploadDir, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "መሪ (Meri) · Compound Navigation API",
    routes: [
      "/api/auth",
      "/api/compounds",
      "GET /api/compounds/:id/destinations (dropdown)",
      "GET /api/compounds/:id/map (Leaflet payload)",
      "POST /api/navigation/outdoor-progress (GPS + ETA)",
      "POST /api/navigation/outdoor-route (walking path via OSRM)",
      "/api/chat",
      "/api/superadmin (setup, applications, invite)",
    ],
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/compounds", compoundRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/navigation", navigationRoutes);
app.use("/api/superadmin", superadminRoutes);

app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
