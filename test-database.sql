-- Test Database Setup
-- Run this to verify your database is working correctly

-- Check if all required tables exist
SELECT 
    'TABLE EXISTENCE CHECK' as test_type,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'categories', 'variants', 'colors', 'sizes', 'size_stock',
        'stores', 'store_users', 'store_sessions', 'store_inventory',
        'sales_transactions', 'barcode_groups', 'warehouse_inventory'
    )
ORDER BY table_name;

-- Check if required functions exist
SELECT 
    'FUNCTION EXISTENCE CHECK' as test_type,
    routine_name as function_name,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN (
        'create_store_user', 'authenticate_store_user', 'validate_store_session'
    )
ORDER BY routine_name;

-- Test data counts
SELECT 'DATA COUNT CHECK' as test_type, 'categories' as table_name, COUNT(*)::text as count FROM categories
UNION ALL
SELECT 'DATA COUNT CHECK', 'variants', COUNT(*)::text FROM variants
UNION ALL
SELECT 'DATA COUNT CHECK', 'colors', COUNT(*)::text FROM colors
UNION ALL
SELECT 'DATA COUNT CHECK', 'size_stock', COUNT(*)::text FROM size_stock
UNION ALL
SELECT 'DATA COUNT CHECK', 'stores', COUNT(*)::text FROM stores
UNION ALL
SELECT 'DATA COUNT CHECK', 'store_users', COUNT(*)::text FROM store_users
UNION ALL
SELECT 'DATA COUNT CHECK', 'store_inventory', COUNT(*)::text FROM store_inventory;

-- Test size_stock data specifically (for barcode preview)
SELECT 
    'SIZE_STOCK TEST' as test_type,
    ss.barcode,
    ss.price::text as price,
    ss.warehouse_stock::text as stock,
    c.name as category,
    v.name as variant,
    col.name as color,
    ss.size_id as size
FROM size_stock ss
JOIN variants v ON ss.variant_id = v.id
JOIN categories c ON v.category_id = c.id
JOIN colors col ON ss.color_id = col.id
ORDER BY ss.barcode;

-- Test store creation capability
SELECT 
    'STORE TEST' as test_type,
    s.name as store_name,
    s.store_code,
    su.name as manager_name,
    su.email as manager_email,
    CASE WHEN su.is_active THEN '✅ ACTIVE' ELSE '❌ INACTIVE' END as status
FROM stores s
LEFT JOIN store_users su ON s.id = su.store_id
ORDER BY s.store_code;

-- Test RLS policies
SELECT 
    'RLS POLICY CHECK' as test_type,
    schemaname,
    tablename,
    policyname,
    '✅ POLICY EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test authentication function
SELECT 
    'FUNCTION TEST' as test_type,
    'Testing create_store_user function' as description,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'create_store_user'
        ) THEN '✅ FUNCTION EXISTS'
        ELSE '❌ FUNCTION MISSING'
    END as status;

-- Final status
SELECT 
    '=== FINAL STATUS ===' as result,
    CASE 
        WHEN (SELECT COUNT(*) FROM size_stock) > 0 
            AND (SELECT COUNT(*) FROM stores) > 0 
            AND (SELECT COUNT(*) FROM store_users) > 0
        THEN '✅ DATABASE READY FOR TESTING'
        ELSE '❌ DATABASE SETUP INCOMPLETE'
    END as status;
