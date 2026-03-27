import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

// Store admin credentials in a mutable variable
let adminCredentials = {
  email: process.env.ADMIN_EMAIL,
  hashedPassword: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)
};

// ✅ LOGIN
router.post("/login", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (email !== adminCredentials.email) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, adminCredentials.hashedPassword);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ LOGOUT
router.post("/logout", (req, res) => {
  res.json({ message: "Logout successful" });
});

// ✅ UPDATE ADMIN CREDENTIALS
router.post("/update", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate at least one field is provided
    if (!email && !password) {
      return res.status(400).json({ 
        message: "Please provide either email or password to update" 
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        message: "Please provide a valid email address" 
      });
    }

    // Validate password length if provided
    if (password && password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters long" 
      });
    }

    // Update email if provided
    if (email) {
      adminCredentials.email = email;
      // Also update environment variable for persistence (if you have a way to save it)
      process.env.ADMIN_EMAIL = email;
    }

    // Update password if provided
    if (password) {
      // Hash the new password
      adminCredentials.hashedPassword = await bcrypt.hash(password, 10);
      // Also update environment variable for persistence
      process.env.ADMIN_PASSWORD = password;
    }

    // Return success response
    res.json({ 
      success: true,
      message: "Admin credentials updated successfully" 
    });
    
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ 
      message: "Failed to update admin credentials" 
    });
  }
});

// ✅ GET CURRENT ADMIN INFO (optional)
router.get("/info", (req, res) => {
  try {
    // Don't send the password hash back!
    res.json({
      email: adminCredentials.email,
      message: "Admin info retrieved"
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get admin info" });
  }
});

export default router;