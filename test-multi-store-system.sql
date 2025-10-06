-- Test Script for Multi-Store System
-- Run this script in your Supabase SQL Editor to create test data

-- First, let's create some test stores with users
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
BEGIN
    -- Create test stores
    INSERT INTO stores (name, location, email, phone, store_code) 
    VALUES 
        ('Downtown Store', '123 Main St, Downtown', 'downtown@example.com', '+1-555-0101', 'STORE001'),
        ('Mall Store', '456 Shopping Center, Mall District', 'mall@example.com', '+1-555-0102', 'STORE002')
    RETURNING id INTO store1_id, store2_id;
    
    -- Get the store IDs (since RETURNING only gets the last one)
    SELECT id INTO store1_id FROM stores WHERE store_code = 'STORE001';
    SELECT id INTO store2_id FROM stores WHERE store_code = 'STORE002';
    
    -- Create store users
    SELECT create_store_user(
        store1_id,
        'manager1@example.com',
        'password123',
        'John Manager',
        'manager'
    ) INTO user1_id;
    
    SELECT create_store_user(
        store2_id,
        'manager2@example.com',
        'password123',
        'Jane Manager',
        'manager'
    ) INTO user2_id;
    
    -- Create test products if they don't exist
    INSERT INTO categories (name) VALUES ('Test T-Shirts') ON CONFLICT (name) DO NOTHING;
    SELECT id INTO category_id FROM categories WHERE name = 'Test T-Shirts';
    
    INSERT INTO variants (category_id, name) VALUES (category_id, 'Test Basic Tee') ON CONFLICT (category_id, name) DO NOTHING;
    SELECT id INTO variant_id FROM variants WHERE category_id = category_id AND name = 'Test Basic Tee';
    
    INSERT INTO colors (variant_id, name, hex) VALUES (variant_id, 'Test Blue', '#0066CC') ON CONFLICT (variant_id, name) DO NOTHING;
    SELECT id INTO color_id FROM colors WHERE variant_id = variant_id AND name = 'Test Blue';
    
    -- Create size stock entries
    INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
    VALUES 
        (variant_id, color_id, 'M', 'TEST001M', 19.99, 100),
        (variant_id, color_id, 'L', 'TEST001L', 19.99, 100)
    ON CONFLICT (variant_id, color_id, size_id) DO NOTHING;
    
    SELECT id INTO size_stock_id1 FROM size_stock WHERE barcode = 'TEST001M';
    SELECT id INTO size_stock_id2 FROM size_stock WHERE barcode = 'TEST001L';
    
    -- Distribute inventory to stores
    INSERT INTO store_inventory (store_id, size_stock_id, quantity)
    VALUES 
        (store1_id, size_stock_id1, 20),
        (store1_id, size_stock_id2, 15),
        (store2_id, size_stock_id1, 25),
        (store2_id, size_stock_id2, 18)
    ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;
    
    -- Create some test sales transactions
    INSERT INTO sales_transactions (store_id, size_stock_id, quantity, price)
    VALUES 
        (store1_id, size_stock_id1, 2, 19.99),
        (store1_id, size_stock_id2, 1, 19.99),
        (store2_id, size_stock_id1, 3, 19.99);
    
    -- Update store inventory to reflect sales
    UPDATE store_inventory SET quantity = quantity - 2 WHERE store_id = store1_id AND size_stock_id = size_stock_id1;
    UPDATE store_inventory SET quantity = quantity - 1 WHERE store_id = store1_id AND size_stock_id = size_stock_id2;
    UPDATE store_inventory SET quantity = quantity - 3 WHERE store_id = store2_id AND size_stock_id = size_stock_id1;
    
    RAISE NOTICE 'Test data created successfully!';
    RAISE NOTICE 'Store 1 ID: %', store1_id;
    RAISE NOTICE 'Store 2 ID: %', store2_id;
    RAISE NOTICE 'Store 1 Manager: manager1@example.com / password123';
    RAISE NOTICE 'Store 2 Manager: manager2@example.com / password123';
    RAISE NOTICE 'Test barcodes: TEST001M, TEST001L';
END $$;

-- Verify the test data
SELECT 
    s.name as store_name,
    s.store_code,
    su.name as manager_name,
    su.email as manager_email
FROM stores s
JOIN store_users su ON s.id = su.store_id
WHERE s.store_code IN ('STORE001', 'STORE002')
ORDER BY s.store_code;

-- Check inventory distribution
SELECT 
    s.name as store_name,
    c.name as category,
    v.name as variant,
    col.name as color,
    sz.name as size,
    ss.barcode,
    si.quantity as store_quantity,
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

-- Check sales transactions
SELECT 
    s.name as store_name,
    ss.barcode,
    st.quantity,
    st.price,
    st.created_at
FROM sales_transactions st
JOIN stores s ON st.store_id = s.id
JOIN size_stock ss ON st.size_stock_id = ss.id
WHERE s.store_code IN ('STORE001', 'STORE002')
ORDER BY st.created_at DESC;
