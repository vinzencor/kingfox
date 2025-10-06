-- Check Current Database State
-- Run this first to see what's currently in your database

-- Check existing stores
SELECT 
    'EXISTING STORES' as section,
    s.name,
    s.store_code,
    s.email,
    s.is_active::text as active
FROM stores s
ORDER BY s.created_at;

-- Check existing store users
SELECT 
    'EXISTING STORE USERS' as section,
    su.name,
    su.email,
    s.name as store_name,
    su.is_active::text as active
FROM store_users su
LEFT JOIN stores s ON su.store_id = s.id
ORDER BY su.created_at;

-- Check existing categories and products
SELECT 
    'EXISTING PRODUCTS' as section,
    c.name as category,
    v.name as variant,
    col.name as color,
    ss.barcode
FROM categories c
LEFT JOIN variants v ON c.id = v.category_id
LEFT JOIN colors col ON v.id = col.variant_id
LEFT JOIN size_stock ss ON v.id = ss.variant_id AND col.id = ss.color_id
ORDER BY c.name, v.name, col.name, ss.barcode;

-- Check store inventory
SELECT 
    'STORE INVENTORY' as section,
    s.name as store_name,
    ss.barcode,
    si.quantity::text
FROM store_inventory si
JOIN stores s ON si.store_id = s.id
JOIN size_stock ss ON si.size_stock_id = ss.id
ORDER BY s.name, ss.barcode;

-- Check for any constraint violations or issues
SELECT 
    'POTENTIAL ISSUES' as section,
    'Duplicate store emails' as issue,
    COUNT(*) - COUNT(DISTINCT email) as count
FROM stores
WHERE email IS NOT NULL
UNION ALL
SELECT 
    'POTENTIAL ISSUES',
    'Duplicate store codes',
    COUNT(*) - COUNT(DISTINCT store_code)
FROM stores
WHERE store_code IS NOT NULL
UNION ALL
SELECT 
    'POTENTIAL ISSUES',
    'Duplicate store user emails',
    COUNT(*) - COUNT(DISTINCT email)
FROM store_users
UNION ALL
SELECT 
    'POTENTIAL ISSUES',
    'Inactive stores',
    COUNT(*)
FROM stores
WHERE is_active = false
UNION ALL
SELECT 
    'POTENTIAL ISSUES',
    'Inactive store users',
    COUNT(*)
FROM store_users
WHERE is_active = false;

-- Check RLS policies
SELECT 
    'RLS POLICIES' as section,
    tablename as table_name,
    policyname as policy_name,
    cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check functions
SELECT 
    'FUNCTIONS' as section,
    routine_name as function_name,
    routine_type as type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%store%'
ORDER BY routine_name;

-- Summary
SELECT 
    '=== SUMMARY ===' as section,
    'Total stores: ' || COUNT(*) as info
FROM stores
UNION ALL
SELECT 
    '=== SUMMARY ===',
    'Total store users: ' || COUNT(*)
FROM store_users
UNION ALL
SELECT 
    '=== SUMMARY ===',
    'Total categories: ' || COUNT(*)
FROM categories
UNION ALL
SELECT 
    '=== SUMMARY ===',
    'Total size stock: ' || COUNT(*)
FROM size_stock
UNION ALL
SELECT 
    '=== SUMMARY ===',
    'Total store inventory: ' || COUNT(*)
FROM store_inventory;
