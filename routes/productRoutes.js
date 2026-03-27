// routes/products.js
import express from "express";
import Product from "../models/Product.js";
import { checkAdmin } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import mongoose from "mongoose";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory:', uploadDir);
}

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpeg, jpg, png, webp, gif)'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Helper function to generate unique ID
const generateUniqueId = async () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const newId = `prod_${timestamp}_${random}`;
  
  // Check if ID already exists
  const existing = await Product.findOne({ id: newId });
  if (existing) {
    return generateUniqueId(); // Recursively generate new one if exists
  }
  return newId;
};

const generateCustomId = async () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const newId = `prod_${timestamp}_${random}`;
  
  // Check if ID already exists
  const existing = await Product.findOne({ id: newId });
  if (existing) {
    return generateCustomId(); // Recursively generate new one if exists
  }
  return newId;
};

// Helper function to format product response
const formatProduct = (product) => ({
  id: product.id,
  title: product.title,
  price: Number(product.price),
  description: product.description,
  category: product.categories,
  image: product.main_image_url,
  createdAt: product.date_created,
  rating: product.rating || { rate: 0, count: 0 },
  stock_quantity: product.stock_quantity || 10
});

// ✅ ADD PRODUCT WITH IMAGE - FIXED to generate custom ID
router.post("/add", checkAdmin, upload.single('image'), async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);
    
    const { title, price, description, categories } = req.body;
    
    if (!title || !price) {
      return res.status(400).json({ error: "Title and price are required" });
    }
    
    // Generate unique custom ID for the new product
    const customId = await generateCustomId();
    console.log("Generated custom ID:", customId);
    
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }
    
    const product = new Product({
      id: customId, // Store the custom ID
      title,
      price: String(price),
      description: description || '',
      categories: categories || 'Uncategorized',
      main_image_url: imageUrl,
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      status: 'publish'
    });
    
    const savedProduct = await product.save();
    console.log("Product saved with custom ID:", savedProduct.id);
    console.log("Product MongoDB _id:", savedProduct._id);
    
    res.json({ 
      success: true, 
      product: formatProduct(savedProduct)
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET ALL PRODUCTS
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ date_created: -1 });
    
    const formatted = products.map((p) => ({
      id: p.id || p._id, // Use custom id if exists, fallback to _id
      title: p.title,
      price: Number(p.price),
      description: p.description,
      category: p.categories,
      image: p.main_image_url,
      createdAt: p.date_created,
      rating: p.rating || { rate: 0, count: 0 },
    }));

    console.log(`Returning ${formatted.length} products`);
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET SINGLE PRODUCT - Find by custom ID
router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    console.log("Fetching product with ID:", productId);
    
    // Try to find by custom id field first
    let product = await Product.findOne({ id: productId });
    
    // If not found by custom id, try by MongoDB _id (for old products)
    if (!product && mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId);
    }
    
    // If still not found, try by string _id
    if (!product) {
      product = await Product.findOne({ _id: productId });
    }
    
    if (!product) {
      console.log("Product not found with ID:", productId);
      return res.status(404).json({ 
        message: "Product not found",
        id: productId 
      });
    }
    
    console.log("Product found:", product.title);
    
    res.json({
      id: product.id || product._id,
      title: product.title,
      price: Number(product.price),
      description: product.description,
      category: product.categories,
      image: product.main_image_url,
      createdAt: product.date_created,
      rating: product.rating || { rate: 0, count: 0 },
    });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET CATEGORIES WITH COUNTS
router.get("/categories/with-counts", async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: "$categories",
          productCount: { $sum: 1 },
          products: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          name: "$_id",
          productCount: 1,
          image: { $arrayElemAt: ["$products.main_image_url", 0] }
        }
      },
      {
        $sort: { productCount: -1 }
      }
    ]);
    
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET PRODUCTS BY CATEGORY
router.get("/category/:categoryName", async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.categoryName);
    const products = await Product.find({ categories: categoryName });
    
    const formatted = products.map((p) => ({
      id: p.id || p._id,
      title: p.title,
      price: Number(p.price),
      description: p.description,
      category: p.categories,
      image: p.main_image_url,
      rating: p.rating || { rate: 0, count: 0 },
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching products by category:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE PRODUCT
router.put("/:id", checkAdmin, upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Find product by custom id or _id
    let product = await Product.findOne({ id: productId });
    if (!product && mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId);
    }
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    const updateData = { ...req.body, date_modified: new Date().toISOString() };
    
    if (req.file) {
      if (product.main_image_url && !product.main_image_url.startsWith('http')) {
        const oldImagePath = path.join(__dirname, '..', product.main_image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.main_image_url = `/uploads/products/${req.file.filename}`;
    }
    
    if (updateData.price) updateData.price = String(updateData.price);
    
    const updated = await Product.findByIdAndUpdate(
      product._id,
      updateData,
      { new: true }
    );
    
    res.json({ 
      success: true, 
      product: {
        id: updated.id || updated._id,
        title: updated.title,
        price: Number(updated.price),
        description: updated.description,
        category: updated.categories,
        image: updated.main_image_url,
      }
    });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE PRODUCT
router.delete("/:id", checkAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Find product by custom id or _id
    let product = await Product.findOne({ id: productId });
    if (!product && mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId);
    }
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Delete image file if exists and is local
    if (product.main_image_url && !product.main_image_url.startsWith('http')) {
      const imagePath = path.join(__dirname, '..', product.main_image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Deleted image:', imagePath);
      }
    }
    
    await Product.findByIdAndDelete(product._id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;