import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";

dotenv.config();

const app = express();

app.use(  cors({
      origin: ["https://ecors-ecom-frontend.vercel.app", "http://localhost:5173"],
      credentials: true 
    }));
    
app.use(express.json());

connectDB();
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);


app.get("/", (req, res) => {
  res.send("API running...");
});

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});