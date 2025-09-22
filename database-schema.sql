-- Warehouse Management System Database Schema
-- Execute these SQL commands in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table (T-Shirts, Pants, etc.)
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Variants table (Polos, Jeans, etc.)
CREATE TABLE variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Colors table (Red, Blue, etc.)
CREATE TABLE colors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hex VARCHAR(7) NOT NULL, -- #RRGGBB format
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variant_id, name)
);

-- Sizes table (S, M, L, XL, XXL)
CREATE TABLE sizes (
    id VARCHAR(10) PRIMARY KEY, -- 's', 'm', 'l', 'xl', 'xxl'
    name VARCHAR(50) NOT NULL UNIQUE,
    "order" INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual Size Stock table (for precise stock management per size)
CREATE TABLE size_stock (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
    size_id VARCHAR(10) NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    warehouse_stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variant_id, color_id, size_id)
);

-- Barcode groups table (Small-Medium, Large-XL, etc.) - kept for compatibility
CREATE TABLE barcode_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_ids TEXT[] NOT NULL, -- Array of size IDs
    price DECIMAL(10,2) NOT NULL,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores table
CREATE TABLE stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse inventory table
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

-- Store inventory table (updated to work with size_stock)
CREATE TABLE store_inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    size_stock_id UUID NOT NULL REFERENCES size_stock(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, size_stock_id)
);

-- Product photos table
CREATE TABLE product_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales transactions table (updated to work with size_stock)
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

-- Create indexes for better performance
CREATE INDEX idx_variants_category_id ON variants(category_id);
CREATE INDEX idx_colors_variant_id ON colors(variant_id);
CREATE INDEX idx_barcode_groups_variant_id ON barcode_groups(variant_id);
CREATE INDEX idx_barcode_groups_barcode ON barcode_groups(barcode);
CREATE INDEX idx_size_stock_variant_id ON size_stock(variant_id);
CREATE INDEX idx_size_stock_barcode ON size_stock(barcode);
CREATE INDEX idx_size_stock_composite ON size_stock(variant_id, color_id, size_id);
CREATE INDEX idx_warehouse_inventory_variant_color_size ON warehouse_inventory(variant_id, color_id, size_id);
CREATE INDEX idx_store_inventory_store_variant_color_size ON store_inventory(store_id, variant_id, color_id, size_id);
CREATE INDEX idx_product_photos_variant_color ON product_photos(variant_id, color_id);
CREATE INDEX idx_sales_transactions_store_created ON sales_transactions(store_id, created_at);
CREATE INDEX idx_sales_transactions_barcode ON sales_transactions(barcode);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colors_updated_at BEFORE UPDATE ON colors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_barcode_groups_updated_at BEFORE UPDATE ON barcode_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouse_inventory_updated_at BEFORE UPDATE ON warehouse_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_inventory_updated_at BEFORE UPDATE ON store_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default sizes
INSERT INTO sizes (id, name, "order") VALUES
('s', 'S', 1),
('m', 'M', 2),
('l', 'L', 3),
('xl', 'XL', 4),
('xxl', 'XXL', 5);

-- Insert sample data
INSERT INTO categories (id, name) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'T-Shirts'),
('550e8400-e29b-41d4-a716-446655440002', 'Pants'),
('550e8400-e29b-41d4-a716-446655440003', 'Shirts');

INSERT INTO variants (id, category_id, name) VALUES
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Polos'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 'Jeans'),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440003', 'Formal Shirts');

INSERT INTO colors (id, variant_id, name, hex) VALUES
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'Red', '#EF4444'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440011', 'Blue', '#3B82F6'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440012', 'Dark Blue', '#1E3A8A'),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440013', 'White', '#FFFFFF');

INSERT INTO stores (id, name, location) VALUES
('550e8400-e29b-41d4-a716-446655440031', 'Downtown Store', 'Main Street, Downtown'),
('550e8400-e29b-41d4-a716-446655440032', 'Mall Store', 'Shopping Center, Mall Road'),
('550e8400-e29b-41d4-a716-446655440033', 'Outlet Store', 'Industrial Area, Sector 5');

-- Insert sample warehouse inventory
INSERT INTO warehouse_inventory (variant_id, color_id, size_id, quantity) VALUES
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 's', 100),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'm', 100),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'l', 100),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'xl', 50),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'xxl', 50),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 's', 80),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'm', 80),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'l', 80),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'xl', 40),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'xxl', 40);

-- Insert sample size stock (individual stock per size)
INSERT INTO size_stock (id, variant_id, color_id, size_id, barcode, price, warehouse_stock) VALUES
-- Polo shirts - Red
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 's', '1001001001', 29.99, 50),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'm', '1001001002', 29.99, 75),
('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'l', '1001001003', 34.99, 60),
('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440021', 'xl', '1001001004', 34.99, 40),
-- Polo shirts - Blue
('550e8400-e29b-41d4-a716-446655440055', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 's', '1001002001', 29.99, 30),
('550e8400-e29b-41d4-a716-446655440056', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'm', '1001002002', 29.99, 45),
('550e8400-e29b-41d4-a716-446655440057', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'l', '1001002003', 34.99, 35),
('550e8400-e29b-41d4-a716-446655440058', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440022', 'xl', '1001002004', 34.99, 25);

-- Insert sample barcode groups (kept for compatibility)
INSERT INTO barcode_groups (id, variant_id, name, size_ids, price, barcode) VALUES
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440011', 'Small-Medium', ARRAY['s', 'm'], 29.99, '123456789012'),
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440011', 'Large-XL-XXL', ARRAY['l', 'xl', 'xxl'], 34.99, '123456789013');

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON categories FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON variants FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON variants FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON variants FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON colors FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON colors FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON colors FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON colors FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON sizes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sizes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sizes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sizes FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON barcode_groups FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON barcode_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON barcode_groups FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON barcode_groups FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON stores FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON stores FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON stores FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON stores FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON warehouse_inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON warehouse_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON warehouse_inventory FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON warehouse_inventory FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON store_inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON store_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON store_inventory FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON store_inventory FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON product_photos FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON product_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON product_photos FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON product_photos FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON sales_transactions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sales_transactions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sales_transactions FOR DELETE USING (true);
