-- Simple Multi-Store System Setup
-- Run this script in your Supabase SQL Editor

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Create store users using the function
SELECT create_store_user(
    (SELECT id FROM stores WHERE store_code = 'STORE001'),
    'downtown.manager@warehousepro.com',
    'store123',
    'John Downtown',
    'manager'
);

SELECT create_store_user(
    (SELECT id FROM stores WHERE store_code = 'STORE002'),
    'mall.manager@warehousepro.com',
    'store123',
    'Jane Mall',
    'manager'
);

-- Create sample products
INSERT INTO categories (name) VALUES ('T-Shirts') ON CONFLICT (name) DO NOTHING;

INSERT INTO variants (category_id, name) 
SELECT id, 'Basic Cotton Tee' 
FROM categories 
WHERE name = 'T-Shirts' 
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO colors (variant_id, name, hex) 
SELECT v.id, 'Navy Blue', '#1e3a8a'
FROM variants v 
JOIN categories c ON v.category_id = c.id 
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee'
ON CONFLICT (variant_id, name) DO NOTHING;

-- Create size stock entries
INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT 
    v.id,
    col.id,
    'S',
    'TSH001S',
    24.99,
    150
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode,
    price = EXCLUDED.price,
    warehouse_stock = EXCLUDED.warehouse_stock;

INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT 
    v.id,
    col.id,
    'M',
    'TSH001M',
    24.99,
    200
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode,
    price = EXCLUDED.price,
    warehouse_stock = EXCLUDED.warehouse_stock;

INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT 
    v.id,
    col.id,
    'L',
    'TSH001L',
    24.99,
    180
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode,
    price = EXCLUDED.price,
    warehouse_stock = EXCLUDED.warehouse_stock;

-- Distribute inventory to stores
INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT 
    s.id,
    ss.id,
    25
FROM stores s, size_stock ss
WHERE s.store_code = 'STORE001' AND ss.barcode = 'TSH001S'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT 
    s.id,
    ss.id,
    30
FROM stores s, size_stock ss
WHERE s.store_code = 'STORE001' AND ss.barcode = 'TSH001M'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT 
    s.id,
    ss.id,
    20
FROM stores s, size_stock ss
WHERE s.store_code = 'STORE001' AND ss.barcode = 'TSH001L'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT 
    s.id,
    ss.id,
    30
FROM stores s, size_stock ss
WHERE s.store_code = 'STORE002' AND ss.barcode = 'TSH001S'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT 
    s.id,
    ss.id,
    35
FROM stores s, size_stock ss
WHERE s.store_code = 'STORE002' AND ss.barcode = 'TSH001M'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT 
    s.id,
    ss.id,
    25
FROM stores s, size_stock ss
WHERE s.store_code = 'STORE002' AND ss.barcode = 'TSH001L'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Show setup results
SELECT 
    '=== SETUP COMPLETE ===' as message,
    '' as details
UNION ALL
SELECT 
    'ADMIN ACCESS:' as message,
    'Email: rahulpradeepan55@gmail.com, Password: 123456' as details
UNION ALL
SELECT 
    'STORE 1:' as message,
    'Email: downtown.manager@warehousepro.com, Password: store123' as details
UNION ALL
SELECT 
    'STORE 2:' as message,
    'Email: mall.manager@warehousepro.com, Password: store123' as details
UNION ALL
SELECT 
    'TEST BARCODES:' as message,
    'TSH001S, TSH001M, TSH001L (all $24.99)' as details;

-- Verify stores and users
SELECT 
    s.name as store_name,
    s.store_code,
    su.name as manager_name,
    su.email as manager_email
FROM stores s
LEFT JOIN store_users su ON s.id = su.store_id
WHERE s.store_code IN ('STORE001', 'STORE002')
ORDER BY s.store_code;
