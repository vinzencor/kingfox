-- Warehouse Management System Database Setup
-- Run this entire script in your Supabase SQL Editor
-- Project: https://thycdwdlanlgcvtedyvl.supabase.co

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing warehouse tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS sales_transactions CASCADE;
DROP TABLE IF EXISTS store_inventory CASCADE;
DROP TABLE IF EXISTS product_photos CASCADE;
DROP TABLE IF EXISTS warehouse_inventory CASCADE;
DROP TABLE IF EXISTS barcode_groups CASCADE;
DROP TABLE IF EXISTS size_stock CASCADE;
DROP TABLE IF EXISTS colors CASCADE;
DROP TABLE IF EXISTS variants CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS sizes CASCADE;

-- Create sizes table
CREATE TABLE sizes (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default sizes
INSERT INTO sizes (id, name, "order") VALUES 
('XS', 'Extra Small', 1),
('S', 'Small', 2),
('M', 'Medium', 3),
('L', 'Large', 4),
('XL', 'Extra Large', 5),
('XXL', 'Double Extra Large', 6);

-- Create categories table
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variants table
CREATE TABLE variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Create colors table
CREATE TABLE colors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    hex VARCHAR(7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variant_id, name)
);

-- Create stores table
CREATE TABLE stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create size_stock table (main inventory table)
CREATE TABLE size_stock (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
    size_id VARCHAR(10) NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    warehouse_stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variant_id, color_id, size_id)
);

-- Create store_inventory table
CREATE TABLE store_inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    size_stock_id UUID NOT NULL REFERENCES size_stock(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, size_stock_id)
);

-- Create sales_transactions table
CREATE TABLE sales_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    size_stock_id UUID NOT NULL REFERENCES size_stock(id) ON DELETE CASCADE,
    barcode VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barcode_groups table (for backward compatibility)
CREATE TABLE barcode_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    size_ids TEXT[] NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warehouse_inventory table (for backward compatibility)
CREATE TABLE warehouse_inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
    size_id VARCHAR(10) NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variant_id, color_id, size_id)
);

-- Create product_photos table
CREATE TABLE product_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO categories (name) VALUES 
('T-Shirts'),
('Pants'),
('Shoes');

-- Insert sample variants and data
DO $$
DECLARE
    tshirt_cat_id UUID;
    pants_cat_id UUID;
    polo_variant_id UUID;
    jeans_variant_id UUID;
    red_color_id UUID;
    blue_color_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO tshirt_cat_id FROM categories WHERE name = 'T-Shirts';
    SELECT id INTO pants_cat_id FROM categories WHERE name = 'Pants';
    
    -- Insert variants
    INSERT INTO variants (category_id, name) VALUES 
    (tshirt_cat_id, 'Polo'),
    (tshirt_cat_id, 'Basic Tee'),
    (pants_cat_id, 'Jeans'),
    (pants_cat_id, 'Chinos');
    
    -- Get variant IDs for sample colors
    SELECT id INTO polo_variant_id FROM variants WHERE name = 'Polo';
    SELECT id INTO jeans_variant_id FROM variants WHERE name = 'Jeans';
    
    -- Insert sample colors
    INSERT INTO colors (variant_id, name, hex) VALUES 
    (polo_variant_id, 'Red', '#FF0000'),
    (polo_variant_id, 'Blue', '#0000FF'),
    (jeans_variant_id, 'Dark Blue', '#000080'),
    (jeans_variant_id, 'Black', '#000000');
    
    -- Get color IDs for sample size stock
    SELECT id INTO red_color_id FROM colors WHERE name = 'Red' AND variant_id = polo_variant_id;
    SELECT id INTO blue_color_id FROM colors WHERE name = 'Blue' AND variant_id = polo_variant_id;
    
    -- Insert sample size stock with barcodes
    INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock) VALUES 
    (polo_variant_id, red_color_id, 'S', '776553601685', 29.99, 50),
    (polo_variant_id, red_color_id, 'M', '776553601686', 29.99, 45),
    (polo_variant_id, red_color_id, 'L', '776553601687', 29.99, 40),
    (polo_variant_id, blue_color_id, 'S', '872997470019', 29.99, 35),
    (polo_variant_id, blue_color_id, 'M', '872997470020', 29.99, 30),
    (polo_variant_id, blue_color_id, 'L', '872997470021', 29.99, 25);
    
    -- Insert sample stores
    INSERT INTO stores (name, location) VALUES 
    ('Main Store', 'Downtown Location'),
    ('Branch Store', 'Mall Location');
    
END $$;

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
CREATE POLICY "Allow all operations" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON variants FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON colors FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sizes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON size_stock FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON store_inventory FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON barcode_groups FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON warehouse_inventory FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON product_photos FOR ALL USING (true);

-- Success message
SELECT 'Warehouse Management Database Setup Complete! 🎉' as status;
