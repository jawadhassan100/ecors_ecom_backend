import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    slug: String,
    description: String,
    short_description: String,
    date_created: String,
    date_modified: String,
    status: String,
    sku: String,
    price: String,
    regular_price: String,
    sale_price: String,
    stock_status: String,
    stock_quantity: String,
    weight: String,
    length: String,
    width: String,
    height: String,
    main_image_url: String,
    gallery_images: String,
    categories: String,
    attributes: String,
  },
  { strict: false } // allows flexibility
);

export default mongoose.model("Product", productSchema, "Products");