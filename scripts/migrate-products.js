// scripts/migrate-products.js
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateProducts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all products
    const products = await Product.find();
    console.log(`Found ${products.length} products`);

    // Check for products with numeric IDs or custom IDs
    let migrated = 0;
    
    for (const product of products) {
      // Check if the product has a custom id field or if _id is not ObjectId
      const originalId = product._id;
      
      // If the product has a custom 'id' field that's not the _id
      if (product.id && product.id !== product._id.toString()) {
        console.log(`Product ${product.title} has custom ID: ${product.id}`);
        
        // Create a new product with proper ObjectId
        const newProduct = new Product({
          title: product.title,
          price: product.price,
          description: product.description,
          categories: product.categories,
          main_image_url: product.main_image_url,
          date_created: product.date_created,
          rating: product.rating,
          stock_quantity: product.stock_quantity
        });
        
        await newProduct.save();
        console.log(`Created new product with ID: ${newProduct._id}`);
        
        // Delete old product
        await Product.findByIdAndDelete(originalId);
        migrated++;
      }
    }
    
    console.log(`Migration complete. Migrated ${migrated} products.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

migrateProducts();