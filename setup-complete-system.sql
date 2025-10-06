-- Complete Multi-Store System Setup
-- Run this script in your Supabase SQL Editor

-- First, ensure all required extensions and tables exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Temporarily disable RLS for setup
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE colors DISABLE ROW LEVEL SECURITY;
ALTER TABLE size_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions DISABLE ROW LEVEL SECURITY;

-- Create test stores with complete information
DO $$
DECLARE
    store1_id UUID;
    store2_id UUID;
    user1_id UUID;
    user2_id UUID;
    category_id UUID;
    variant_id UUID;
    color_id UUID;
    size_stock_id1 UUID;
    size_stock_id2 UUID;
    size_stock_id3 UUID;
BEGIN
    -- Create test stores
    INSERT INTO stores (name, location, email, phone, store_code, is_active) 
    VALUES 
        ('Downtown Store', '123 Main Street, Downtown District', 'downtown@warehousepro.com', '+1-555-0101', 'STORE001', true),
        ('Mall Store', '456 Shopping Center, Mall District', 'mall@warehousepro.com', '+1-555-0102', 'STORE002', true)
    ON CONFLICT (store_code) DO UPDATE SET
        name = EXCLUDED.name,
        location = EXCLUDED.location,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        is_active = EXCLUDED.is_active;
    
    -- Get the store IDs
    SELECT id INTO store1_id FROM stores WHERE store_code = 'STORE001';
    SELECT id INTO store2_id FROM stores WHERE store_code = 'STORE002';
    
    -- Create store users (managers)
    SELECT create_store_user(
        store1_id,
        'downtown.manager@warehousepro.com',
        'store123',
        'John Downtown',
        'manager'
    ) INTO user1_id;
    
    SELECT create_store_user(
        store2_id,
        'mall.manager@warehousepro.com',
        'store123',
        'Jane Mall',
        'manager'
    ) INTO user2_id;
    
    -- Create sample products if they don't exist
    INSERT INTO categories (name) VALUES ('T-Shirts') ON CONFLICT (name) DO NOTHING;
    INSERT INTO categories (name) VALUES ('Jeans') ON CONFLICT (name) DO NOTHING;

    -- Get category ID for T-Shirts
    SELECT id INTO category_id FROM categories WHERE name = 'T-Shirts';

    -- Create variants (fix ambiguous column reference)
    INSERT INTO variants (category_id, name) VALUES (category_id, 'Basic Cotton Tee') ON CONFLICT (category_id, name) DO NOTHING;
    SELECT v.id INTO variant_id FROM variants v WHERE v.category_id = category_id AND v.name = 'Basic Cotton Tee';

    -- Create colors (fix ambiguous column reference)
    INSERT INTO colors (variant_id, name, hex) VALUES (variant_id, 'Navy Blue', '#1e3a8a') ON CONFLICT (variant_id, name) DO NOTHING;
    INSERT INTO colors (variant_id, name, hex) VALUES (variant_id, 'White', '#ffffff') ON CONFLICT (variant_id, name) DO NOTHING;
    SELECT c.id INTO color_id FROM colors c WHERE c.variant_id = variant_id AND c.name = 'Navy Blue';
    
    -- Create size stock entries with different barcodes
    INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
    VALUES
        (variant_id, color_id, 'S', 'TSH001S', 24.99, 150),
        (variant_id, color_id, 'M', 'TSH001M', 24.99, 200),
        (variant_id, color_id, 'L', 'TSH001L', 24.99, 180)
    ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
        barcode = EXCLUDED.barcode,
        price = EXCLUDED.price,
        warehouse_stock = EXCLUDED.warehouse_stock;

    -- Get size stock IDs
    SELECT ss.id INTO size_stock_id1 FROM size_stock ss WHERE ss.barcode = 'TSH001S';
    SELECT ss.id INTO size_stock_id2 FROM size_stock ss WHERE ss.barcode = 'TSH001M';
    SELECT ss.id INTO size_stock_id3 FROM size_stock ss WHERE ss.barcode = 'TSH001L';
    
    -- Distribute inventory to stores
    INSERT INTO store_inventory (store_id, size_stock_id, quantity)
    VALUES 
        -- Downtown Store inventory
        (store1_id, size_stock_id1, 25),
        (store1_id, size_stock_id2, 30),
        (store1_id, size_stock_id3, 20),
        -- Mall Store inventory
        (store2_id, size_stock_id1, 30),
        (store2_id, size_stock_id2, 35),
        (store2_id, size_stock_id3, 25)
    ON CONFLICT (store_id, size_stock_id) DO UPDATE SET 
        quantity = EXCLUDED.quantity;
    
    -- Create some sample sales transactions for demonstration
    INSERT INTO sales_transactions (store_id, size_stock_id, quantity, price, created_at)
    VALUES 
        -- Downtown Store sales
        (store1_id, size_stock_id1, 2, 24.99, NOW() - INTERVAL '2 hours'),
        (store1_id, size_stock_id2, 3, 24.99, NOW() - INTERVAL '1 hour'),
        (store1_id, size_stock_id3, 1, 24.99, NOW() - INTERVAL '30 minutes'),
        -- Mall Store sales
        (store2_id, size_stock_id1, 1, 24.99, NOW() - INTERVAL '3 hours'),
        (store2_id, size_stock_id2, 2, 24.99, NOW() - INTERVAL '45 minutes'),
        (store2_id, size_stock_id3, 4, 24.99, NOW() - INTERVAL '15 minutes');
    
    -- Update store inventory to reflect the sales
    UPDATE store_inventory SET quantity = quantity - 2 WHERE store_id = store1_id AND size_stock_id = size_stock_id1;
    UPDATE store_inventory SET quantity = quantity - 3 WHERE store_id = store1_id AND size_stock_id = size_stock_id2;
    UPDATE store_inventory SET quantity = quantity - 1 WHERE store_id = store1_id AND size_stock_id = size_stock_id3;
    UPDATE store_inventory SET quantity = quantity - 1 WHERE store_id = store2_id AND size_stock_id = size_stock_id1;
    UPDATE store_inventory SET quantity = quantity - 2 WHERE store_id = store2_id AND size_stock_id = size_stock_id2;
    UPDATE store_inventory SET quantity = quantity - 4 WHERE store_id = store2_id AND size_stock_id = size_stock_id3;
    
    RAISE NOTICE '=== MULTI-STORE SYSTEM SETUP COMPLETE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'ADMIN ACCESS:';
    RAISE NOTICE 'Email: rahulpradeepan55@gmail.com';
    RAISE NOTICE 'Password: 123456';
    RAISE NOTICE '';
    RAISE NOTICE 'STORE ACCESS:';
    RAISE NOTICE '';
    RAISE NOTICE 'Downtown Store Manager:';
    RAISE NOTICE 'Email: downtown.manager@warehousepro.com';
    RAISE NOTICE 'Password: store123';
    RAISE NOTICE 'Store Code: STORE001';
    RAISE NOTICE '';
    RAISE NOTICE 'Mall Store Manager:';
    RAISE NOTICE 'Email: mall.manager@warehousepro.com';
    RAISE NOTICE 'Password: store123';
    RAISE NOTICE 'Store Code: STORE002';
    RAISE NOTICE '';
    RAISE NOTICE 'TEST BARCODES:';
    RAISE NOTICE 'TSH001S (Small T-Shirt) - $24.99';
    RAISE NOTICE 'TSH001M (Medium T-Shirt) - $24.99';
    RAISE NOTICE 'TSH001L (Large T-Shirt) - $24.99';
    RAISE NOTICE '';
    RAISE NOTICE 'System is ready for testing!';
END $$;

-- Re-enable RLS after setup
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

-- Verify the setup
SELECT 
    'STORES' as section,
    s.name as store_name,
    s.store_code,
    s.location,
    s.email,
    s.phone,
    s.is_active
FROM stores s
WHERE s.store_code IN ('STORE001', 'STORE002')
UNION ALL
SELECT 
    'STORE USERS' as section,
    su.name as store_name,
    su.email as store_code,
    su.role as location,
    s.name as email,
    CASE WHEN su.is_active THEN 'Active' ELSE 'Inactive' END as phone,
    su.is_active
FROM store_users su
JOIN stores s ON su.store_id = s.id
WHERE s.store_code IN ('STORE001', 'STORE002')
ORDER BY section, store_name;

-- Show inventory summary
SELECT 
    s.name as store_name,
    c.name as category,
    v.name as variant,
    col.name as color,
    sz.name as size,
    ss.barcode,
    si.quantity as current_stock,
    ss.price
FROM store_inventory si
JOIN stores s ON si.store_id = s.id
JOIN size_stock ss ON si.size_stock_id = ss.id
JOIN variants v ON ss.variant_id = v.id
JOIN categories c ON v.category_id = c.id
JOIN colors col ON ss.color_id = col.id
JOIN sizes sz ON ss.size_id = sz.id
WHERE s.store_code IN ('STORE001', 'STORE002')
ORDER BY s.name, ss.barcode;
