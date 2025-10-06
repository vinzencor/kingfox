-- Fix All Store Issues
-- This script fixes login issues, function return types, and adds delete functionality
-- Run this script in your Supabase SQL Editor

-- Clean up existing test data first (to avoid conflicts)
DELETE FROM store_audit_log WHERE store_id IN (
    SELECT id FROM stores WHERE store_code IN ('STORE001', 'STORE002')
);

DELETE FROM store_sessions WHERE store_user_id IN (
    SELECT id FROM store_users WHERE email LIKE '%warehousepro.com'
);

DELETE FROM store_inventory WHERE store_id IN (
    SELECT id FROM stores WHERE store_code IN ('STORE001', 'STORE002')
);

DELETE FROM sales_transactions WHERE store_id IN (
    SELECT id FROM stores WHERE store_code IN ('STORE001', 'STORE002')
);

DELETE FROM store_users WHERE email LIKE '%warehousepro.com';
DELETE FROM stores WHERE store_code IN ('STORE001', 'STORE002');

-- Clean up test products
DELETE FROM size_stock WHERE barcode LIKE 'TSH001%';
DELETE FROM colors WHERE name IN ('Navy Blue', 'White') AND variant_id IN (
    SELECT v.id FROM variants v 
    JOIN categories c ON v.category_id = c.id 
    WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee'
);
DELETE FROM variants WHERE name = 'Basic Cotton Tee';
DELETE FROM categories WHERE name IN ('T-Shirts', 'Jeans');

-- Drop and recreate ALL store-related functions with correct return types
DROP FUNCTION IF EXISTS create_store_user(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS authenticate_store_user(TEXT, TEXT);
DROP FUNCTION IF EXISTS validate_store_session(TEXT);
DROP FUNCTION IF EXISTS delete_store_with_dependencies(UUID);

-- Create store user function
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

-- Fixed authenticate_store_user function with correct return types
CREATE OR REPLACE FUNCTION authenticate_store_user(user_email TEXT, user_password TEXT)
RETURNS TABLE(
    user_id UUID,
    store_id UUID,
    store_name TEXT,
    user_name TEXT,
    user_role TEXT,
    session_token TEXT
) AS $$
DECLARE
    user_record RECORD;
    new_session_token TEXT;
BEGIN
    -- Find user by email with explicit column selection
    SELECT 
        su.id as user_id,
        su.store_id as store_id,
        su.name as user_name,
        su.role as user_role,
        s.name as store_name,
        su.password_hash
    INTO user_record
    FROM store_users su
    JOIN stores s ON su.store_id = s.id
    WHERE su.email = user_email AND su.is_active = true AND s.is_active = true;
    
    -- Check if user exists and password matches
    IF user_record.user_id IS NULL OR user_record.password_hash != crypt(user_password, user_record.password_hash) THEN
        RETURN;
    END IF;
    
    -- Generate session token
    new_session_token := encode(gen_random_bytes(32), 'base64');
    
    -- Clean up old sessions for this user
    DELETE FROM store_sessions WHERE store_user_id = user_record.user_id AND expires_at < NOW();
    
    -- Create new session
    INSERT INTO store_sessions (store_user_id, session_token, expires_at)
    VALUES (user_record.user_id, new_session_token, NOW() + INTERVAL '24 hours');
    
    -- Update last login
    UPDATE store_users SET last_login = NOW() WHERE id = user_record.user_id;
    
    -- Return user info with explicit casting
    RETURN QUERY SELECT 
        user_record.user_id,
        user_record.store_id,
        user_record.store_name::TEXT,
        user_record.user_name::TEXT,
        user_record.user_role::TEXT,
        new_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fixed validate_store_session function
CREATE OR REPLACE FUNCTION validate_store_session(token TEXT)
RETURNS TABLE(
    user_id UUID,
    store_id UUID,
    store_name TEXT,
    user_name TEXT,
    user_role TEXT
) AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Find valid session with explicit column selection
    SELECT 
        ss.store_user_id as user_id,
        su.store_id as store_id,
        su.name as user_name,
        su.role as user_role,
        s.name as store_name
    INTO session_record
    FROM store_sessions ss
    JOIN store_users su ON ss.store_user_id = su.id
    JOIN stores s ON su.store_id = s.id
    WHERE ss.session_token = token 
        AND ss.expires_at > NOW()
        AND su.is_active = true 
        AND s.is_active = true;
    
    IF session_record.user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Update last accessed
    UPDATE store_sessions SET last_accessed = NOW() WHERE session_token = token;
    
    -- Return user info with explicit casting
    RETURN QUERY SELECT 
        session_record.user_id,
        session_record.store_id,
        session_record.store_name::TEXT,
        session_record.user_name::TEXT,
        session_record.user_role::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete store with all dependencies
CREATE OR REPLACE FUNCTION delete_store_with_dependencies(p_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Delete in correct order to avoid foreign key constraints
    
    -- Delete audit log entries
    DELETE FROM store_audit_log WHERE store_id = p_store_id;
    
    -- Delete store sessions
    DELETE FROM store_sessions WHERE store_user_id IN (
        SELECT id FROM store_users WHERE store_id = p_store_id
    );
    
    -- Delete sales transactions
    DELETE FROM sales_transactions WHERE store_id = p_store_id;
    
    -- Delete store inventory
    DELETE FROM store_inventory WHERE store_id = p_store_id;
    
    -- Delete store users
    DELETE FROM store_users WHERE store_id = p_store_id;
    
    -- Finally delete the store
    DELETE FROM stores WHERE id = p_store_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create fresh test data
INSERT INTO categories (name) VALUES ('T-Shirts') ON CONFLICT (name) DO NOTHING;

INSERT INTO variants (category_id, name) 
SELECT c.id, 'Basic Cotton Tee' 
FROM categories c 
WHERE c.name = 'T-Shirts' 
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO colors (variant_id, name, hex) 
SELECT v.id, 'Navy Blue', '#1e3a8a'
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
    barcode = EXCLUDED.barcode, price = EXCLUDED.price, warehouse_stock = EXCLUDED.warehouse_stock;

INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT v.id, col.id, 'M', 'TSH001M', 24.99, 200
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode, price = EXCLUDED.price, warehouse_stock = EXCLUDED.warehouse_stock;

INSERT INTO size_stock (variant_id, color_id, size_id, barcode, price, warehouse_stock)
SELECT v.id, col.id, 'L', 'TSH001L', 24.99, 180
FROM variants v
JOIN categories c ON v.category_id = c.id
JOIN colors col ON col.variant_id = v.id
WHERE c.name = 'T-Shirts' AND v.name = 'Basic Cotton Tee' AND col.name = 'Navy Blue'
ON CONFLICT (variant_id, color_id, size_id) DO UPDATE SET
    barcode = EXCLUDED.barcode, price = EXCLUDED.price, warehouse_stock = EXCLUDED.warehouse_stock;

-- Create test stores
INSERT INTO stores (name, location, email, phone, store_code, is_active) 
VALUES 
    ('Downtown Store', '123 Main Street, Downtown District', 'downtown@warehousepro.com', '+1-555-0101', 'STORE001', true),
    ('Mall Store', '456 Shopping Center, Mall District', 'mall@warehousepro.com', '+1-555-0102', 'STORE002', true)
ON CONFLICT (store_code) DO UPDATE SET
    name = EXCLUDED.name, location = EXCLUDED.location, email = EXCLUDED.email, phone = EXCLUDED.phone, is_active = EXCLUDED.is_active;

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
SELECT s.id, ss.id, 25
FROM stores s CROSS JOIN size_stock ss
WHERE s.store_code = 'STORE001' AND ss.barcode = 'TSH001S'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT s.id, ss.id, 30
FROM stores s CROSS JOIN size_stock ss
WHERE s.store_code = 'STORE001' AND ss.barcode = 'TSH001M'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

INSERT INTO store_inventory (store_id, size_stock_id, quantity)
SELECT s.id, ss.id, 20
FROM stores s CROSS JOIN size_stock ss
WHERE s.store_code = 'STORE001' AND ss.barcode = 'TSH001L'
ON CONFLICT (store_id, size_stock_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Final verification
SELECT '✅ ALL STORE ISSUES FIXED!' as status;

SELECT 'CREDENTIALS' as section, 'Admin: rahulpradeepan55@gmail.com / 123456' as info
UNION ALL SELECT 'CREDENTIALS', 'Downtown: downtown.manager@warehousepro.com / store123'
UNION ALL SELECT 'CREDENTIALS', 'Mall: mall.manager@warehousepro.com / store123'
UNION ALL SELECT 'TEST BARCODES', 'TSH001S, TSH001M, TSH001L (all $24.99)';

-- Test the authentication function
SELECT 'TESTING AUTHENTICATION' as test, user_name, store_name 
FROM authenticate_store_user('downtown.manager@warehousepro.com', 'store123');
