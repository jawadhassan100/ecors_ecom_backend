import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json());

connectDB();
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);

app.get("/test-image", (req, res) => {
  res.json({ 
    uploadsPath: path.join(__dirname, 'uploads'),
    staticPath: '/uploads'
  });
});

app.get("/", (req, res) => {
  res.send("API running...");
});

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});