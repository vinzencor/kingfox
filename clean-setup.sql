-- Clean Setup Script
-- This will completely reset and set up your multi-store system
-- Run this script in your Supabase SQL Editor

-- Disable RLS temporarily for cleanup
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE colors DISABLE ROW LEVEL SECURITY;
ALTER TABLE sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE size_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_photos DISABLE ROW LEVEL SECURITY;

-- Disable RLS on audit log if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_audit_log') THEN
        ALTER TABLE store_audit_log DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Clean up all existing test data (be careful - this removes ALL data)
-- Clean up in correct order to avoid foreign key constraints
TRUNCATE TABLE store_sessions CASCADE;
TRUNCATE TABLE sales_transactions CASCADE;
TRUNCATE TABLE store_inventory CASCADE;

-- Clean up audit log if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_audit_log') THEN
        TRUNCATE TABLE store_audit_log CASCADE;
    END IF;
END $$;

TRUNCATE TABLE store_users CASCADE;
TRUNCATE TABLE stores CASCADE;
TRUNCATE TABLE size_stock CASCADE;
TRUNCATE TABLE colors CASCADE;
TRUNCATE TABLE variants CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE barcode_groups CASCADE;
TRUNCATE TABLE warehouse_inventory CASCADE;
TRUNCATE TABLE product_photos CASCADE;

-- Reset sequences
ALTER SEQUENCE IF EXISTS stores_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS store_users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS categories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS variants_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS colors_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS size_stock_id_seq RESTART WITH 1;

-- Recreate the create_store_user function with proper UPSERT
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
    new_user_id UUID;
BEGIN
    INSERT INTO store_users (store_id, email, password_hash, name, role, is_active)
    VALUES (p_store_id, p_email, crypt(p_password, gen_salt('bf')), p_name, p_role, true)
    ON CONFLICT (email) DO UPDATE SET
        store_id = EXCLUDED.store_id,
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create fresh data
-- Categories
INSERT INTO categories (id, name) VALUES 
    (gen_random_uuid(), 'T-Shirts'),
    (gen_random_uuid(), 'Jeans');

-- Variants
INSERT INTO variants (id, category_id, name) 
SELECT 
    gen_random_uuid(),
    c.id, 
    'Basic Cotton Tee' 
FROM categories c 
WHERE c.name = 'T-Shirts';

-- Colors
INSERT INTO colors (id, variant_id, name, hex) 
SELECT 
    gen_random_uuid(),
    v.id, 
    'Navy Blue', 
    '#1e3a8a'
FROM variants v 
JOIN categories c ON v.category_id = c.id 
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee';

INSERT INTO colors (id, variant_id, name, hex) 
SELECT 
    gen_random_uuid(),
    v.id, 
    'White', 
    '#ffffff'
FROM variants v 
JOIN categories c ON v.category_id = c.id 
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee';

-- Size stock with barcodes
INSERT INTO size_stock (id, variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT 
    gen_random_uuid(),
    v.id, 
    col.id, 
    'S', 
    'TSH001S', 
    24.99, 
    150
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue';

INSERT INTO size_stock (id, variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT 
    gen_random_uuid(),
    v.id, 
    col.id, 
    'M', 
    'TSH001M', 
    24.99, 
    200
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue';

INSERT INTO size_stock (id, variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT 
    gen_random_uuid(),
    v.id, 
    col.id, 
    'L', 
    'TSH001L', 
    24.99, 
    180
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue';

-- Create stores
INSERT INTO stores (id, name, location, email, phone, store_code, is_active) VALUES 
    (gen_random_uuid(), 'Downtown Store', '123 Main Street, Downtown District', 'downtown@warehousepro.com', '+1-555-0101', 'STORE001', true),
    (gen_random_uuid(), 'Mall Store', '456 Shopping Center, Mall District', 'mall@warehousepro.com', '+1-555-0102', 'STORE002', true);

-- Create store users
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
    AND ss.barcode LIKE 'TSH001%';

-- Re-enable RLS with permissive policies
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all access" ON categories;
DROP POLICY IF EXISTS "Allow all access" ON variants;
DROP POLICY IF EXISTS "Allow all access" ON colors;
DROP POLICY IF EXISTS "Allow all access" ON sizes;
DROP POLICY IF EXISTS "Allow all access" ON size_stock;
DROP POLICY IF EXISTS "Allow all access" ON stores;
DROP POLICY IF EXISTS "Allow all access" ON store_inventory;
DROP POLICY IF EXISTS "Allow all access" ON sales_transactions;
DROP POLICY IF EXISTS "Allow all access" ON barcode_groups;
DROP POLICY IF EXISTS "Allow all access" ON warehouse_inventory;
DROP POLICY IF EXISTS "Allow all access" ON product_photos;
DROP POLICY IF EXISTS "Allow all access" ON store_users;
DROP POLICY IF EXISTS "Allow all access" ON store_sessions;

-- Create permissive policies for development
CREATE POLICY "Allow all access" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all access" ON variants FOR ALL USING (true);
CREATE POLICY "Allow all access" ON colors FOR ALL USING (true);
CREATE POLICY "Allow all access" ON sizes FOR ALL USING (true);
CREATE POLICY "Allow all access" ON size_stock FOR ALL USING (true);
CREATE POLICY "Allow all access" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all access" ON store_inventory FOR ALL USING (true);
CREATE POLICY "Allow all access" ON sales_transactions FOR ALL USING (true);
CREATE POLICY "Allow all access" ON barcode_groups FOR ALL USING (true);
CREATE POLICY "Allow all access" ON warehouse_inventory FOR ALL USING (true);
CREATE POLICY "Allow all access" ON product_photos FOR ALL USING (true);
CREATE POLICY "Allow all access" ON store_users FOR ALL USING (true);
CREATE POLICY "Allow all access" ON store_sessions FOR ALL USING (true);

-- Final verification
SELECT '✅ CLEAN SETUP COMPLETE!' as status;

SELECT 
    'LOGIN CREDENTIALS' as section,
    'Admin: rahulpradeepan55@gmail.com / 123456' as credentials
UNION ALL
SELECT 
    'LOGIN CREDENTIALS',
    'Downtown Store: downtown.manager@warehousepro.com / store123'
UNION ALL
SELECT 
    'LOGIN CREDENTIALS',
    'Mall Store: mall.manager@warehousepro.com / store123'
UNION ALL
SELECT 
    'TEST BARCODES',
    'TSH001S, TSH001M, TSH001L (all $24.99)';

SELECT 
    'DATA SUMMARY' as section,
    'Stores: ' || (SELECT COUNT(*) FROM stores) as count
UNION ALL
SELECT 
    'DATA SUMMARY',
    'Store Users: ' || (SELECT COUNT(*) FROM store_users)
UNION ALL
SELECT 
    'DATA SUMMARY',
    'Products: ' || (SELECT COUNT(*) FROM size_stock)
UNION ALL
SELECT 
    'DATA SUMMARY',
    'Store Inventory: ' || (SELECT COUNT(*) FROM store_inventory);
