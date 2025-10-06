-- Fix Duplicate Users Issue
-- Run this script in your Supabase SQL Editor

-- First, let's clean up any existing test data to start fresh
-- Clean up in the correct order to avoid foreign key constraint violations

DELETE FROM store_sessions WHERE store_user_id IN (
    SELECT id FROM store_users WHERE email LIKE '%warehousepro.com'
);

DELETE FROM store_inventory WHERE store_id IN (
    SELECT id FROM stores WHERE store_code IN ('STORE001', 'STORE002')
);

DELETE FROM sales_transactions WHERE store_id IN (
    SELECT id FROM stores WHERE store_code IN ('STORE001', 'STORE002')
);

-- Clean up audit log entries that reference the stores
DELETE FROM store_audit_log WHERE store_id IN (
    SELECT id FROM stores WHERE store_code IN ('STORE001', 'STORE002')
);

DELETE FROM store_users WHERE email LIKE '%warehousepro.com';

DELETE FROM stores WHERE store_code IN ('STORE001', 'STORE002');

-- Also clean up any existing test products
DELETE FROM size_stock WHERE barcode LIKE 'TSH001%';
DELETE FROM colors WHERE name IN ('Navy Blue', 'White') AND variant_id IN (
    SELECT v.id FROM variants v 
    JOIN categories c ON v.category_id = c.id 
    WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee'
);
DELETE FROM variants WHERE name = 'Basic Cotton Tee';
DELETE FROM categories WHERE name IN ('T-Shirts', 'Jeans');

-- Drop and recreate the create_store_user function with UPSERT capability
DROP FUNCTION IF EXISTS create_store_user(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_store_user(
    p_store_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'manager'
)
RETURNS UUID AS $$
DECLARE
    existing_user_id UUID;
    new_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO existing_user_id 
    FROM store_users 
    WHERE email = p_email;
    
    IF existing_user_id IS NOT NULL THEN
        -- Update existing user
        UPDATE store_users 
        SET 
            store_id = p_store_id,
            password_hash = crypt(p_password, gen_salt('bf')),
            name = p_name,
            role = p_role,
            is_active = true,
            updated_at = NOW()
        WHERE id = existing_user_id;
        
        RETURN existing_user_id;
    ELSE
        -- Create new user
        INSERT INTO store_users (store_id, email, password_hash, name, role, is_active)
        VALUES (p_store_id, p_email, crypt(p_password, gen_salt('bf')), p_name, p_role, true)
        RETURNING id INTO new_user_id;
        
        RETURN new_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create fresh test data
-- Create categories
INSERT INTO categories (name) VALUES ('T-Shirts') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Jeans') ON CONFLICT (name) DO NOTHING;

-- Create variants
INSERT INTO variants (category_id, name) 
SELECT c.id, 'Basic Cotton Tee' 
FROM categories c 
WHERE c.name = 'T-Shirts' 
ON CONFLICT (category_id, name) DO NOTHING;

-- Create colors
INSERT INTO colors (variant_id, name, hex) 
SELECT v.id, 'Navy Blue', '#1e3a8a'
FROM variants v 
JOIN categories c ON v.category_id = c.id 
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee'
ON CONFLICT (variant_id, name) DO NOTHING;

INSERT INTO colors (variant_id, name, hex) 
SELECT v.id, 'White', '#ffffff'
FROM variants v 
JOIN categories c ON v.category_id = c.id 
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee'
ON CONFLICT (variant_id, name) DO NOTHING;

-- Create size stock with barcodes
INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT v.id, col.id, 'S', 'TSH001S', 24.99, 150
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode,
    price = EXCLUDED.price,
    warehouse_stock = EXCLUDED.warehouse_stock;

INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT v.id, col.id, 'M', 'TSH001M', 24.99, 200
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode,
    price = EXCLUDED.price,
    warehouse_stock = EXCLUDED.warehouse_stock;

INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT v.id, col.id, 'L', 'TSH001L', 24.99, 180
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode,
    price = EXCLUDED.price,
    warehouse_stock = EXCLUDED.warehouse_stock;

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

-- Create store users (now with UPSERT capability)
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

-- Add inventory to stores
INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT 
    s.id,
    ss.id,
    CASE 
        WHEN ss.barcode = 'TSH001S' THEN 25
        WHEN ss.barcode = 'TSH001M' THEN 30
        WHEN ss.barcode = 'TSH001L' THEN 20
        ELSE 15
    END
FROM stores s
CROSS JOIN size_stock ss
WHERE s.store_code IN ('STORE001', 'STORE002')
    AND ss.barcode LIKE 'TSH001%'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET 
    quantity = EXCLUDED.quantity;

-- Verification
SELECT 
    '=== SETUP COMPLETE ===' as status,
    '' as details
UNION ALL
SELECT 
    'Stores created:' as status,
    COUNT(*)::text as details
FROM stores WHERE store_code IN ('STORE001', 'STORE002')
UNION ALL
SELECT 
    'Store users created:' as status,
    COUNT(*)::text as details
FROM store_users WHERE email LIKE '%warehousepro.com'
UNION ALL
SELECT 
    'Size stock created:' as status,
    COUNT(*)::text as details
FROM size_stock WHERE barcode LIKE 'TSH001%'
UNION ALL
SELECT 
    'Store inventory records:' as status,
    COUNT(*)::text as details
FROM store_inventory si
JOIN stores s ON si.store_id = s.id
WHERE s.store_code IN ('STORE001', 'STORE002');

-- Show login credentials
SELECT 
    '=== LOGIN CREDENTIALS ===' as info,
    '' as email,
    '' as password
UNION ALL
SELECT 
    'ADMIN:' as info,
    'rahulpradeepan55@gmail.com' as email,
    '123456' as password
UNION ALL
SELECT 
    'DOWNTOWN STORE:' as info,
    'downtown.manager@warehousepro.com' as email,
    'store123' as password
UNION ALL
SELECT 
    'MALL STORE:' as info,
    'mall.manager@warehousepro.com' as email,
    'store123' as password;

SELECT '✅ Database setup complete! No more duplicate key errors.' as final_status;
