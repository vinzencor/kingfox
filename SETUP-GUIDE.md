# Multi-Store System Setup Guide

## 🚨 Important: Run Scripts in Order

To fix the Supabase RLS issues and set up the multi-store system properly, follow these steps **in exact order**:

## Step 1: Fix RLS Policies
Run this script first in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of fix-rls-policies.sql
```
**File**: `fix-rls-policies.sql`

This will:
- Remove conflicting RLS policies
- Create permissive policies for development
- Enable RLS on all tables properly

## Step 2: Set Up Test Data
Run this script second in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of simple-setup.sql
```
**File**: `simple-setup.sql`

This will:
- Create test stores
- Create store manager accounts
- Add sample products and inventory
- Set up test barcodes

## Step 3: Test the System

### Admin Access
1. Go to http://localhost:5174/
2. Choose "Admin Dashboard"
3. Login with:
   - **Email**: `rahulpradeepan55@gmail.com`
   - **Password**: `123456`

### Store Access
1. Go to http://localhost:5174/
2. Choose "Store Access"
3. Login with either:

**Downtown Store Manager:**
- **Email**: `downtown.manager@warehousepro.com`
- **Password**: `store123`

**Mall Store Manager:**
- **Email**: `mall.manager@warehousepro.com`
- **Password**: `store123`

## Step 4: Test POS System

After logging into a store:
1. Navigate to "POS System"
2. Scan or enter these test barcodes:
   - `TSH001S` (Small T-Shirt - $24.99)
   - `TSH001M` (Medium T-Shirt - $24.99)
   - `TSH001L` (Large T-Shirt - $24.99)
3. Add items to cart
4. Process payment
5. Check dashboard for updated metrics

## 🔧 Troubleshooting

### If you get RLS errors:
1. Make sure you ran `fix-rls-policies.sql` first
2. Check that you're using the service role key in Supabase
3. Verify all tables have the correct policies

### If store creation fails:
1. Check browser console for errors
2. Verify the `create_store_user` function exists
3. Make sure RLS policies allow store creation

### If login fails:
1. Verify credentials are correct
2. Check that store users were created properly
3. Look for authentication errors in browser console

## 🎯 Key Features to Test

### Admin Dashboard:
- ✅ Create new stores with manager credentials
- ✅ View all stores and inventory
- ✅ Manage products and categories
- ✅ Distribute inventory to stores
- ✅ Logout functionality in profile section

### Store Dashboard:
- ✅ View store-specific metrics
- ✅ See recent transactions
- ✅ Monitor low stock alerts
- ✅ Real-time inventory updates

### POS System:
- ✅ Barcode scanning
- ✅ Cart management
- ✅ Payment processing
- ✅ Automatic inventory reduction
- ✅ Real-time dashboard updates

## 📊 Database Verification

After setup, verify your data with these queries:

```sql
-- Check stores
SELECT name, store_code, email FROM stores;

-- Check store users
SELECT su.name, su.email, s.name as store_name 
FROM store_users su 
JOIN stores s ON su.store_id = s.id;

-- Check inventory
SELECT s.name as store, ss.barcode, si.quantity 
FROM store_inventory si
JOIN stores s ON si.store_id = s.id
JOIN size_stock ss ON si.size_stock_id = ss.id;
```

## 🔐 Security Notes

The current setup uses permissive RLS policies for development. For production:

1. Implement proper store-specific RLS policies
2. Add JWT token validation
3. Restrict access based on user roles
4. Enable audit logging
5. Add rate limiting

## 🆘 Need Help?

If you encounter issues:

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Supabase Logs**: View database query logs
3. **Verify Scripts**: Ensure all SQL scripts ran successfully
4. **Test Step by Step**: Try each feature individually

## 📝 Next Steps

Once the system is working:

1. **Create Your Own Stores**: Use the admin interface
2. **Add Real Products**: Import your inventory
3. **Customize Branding**: Update colors and logos
4. **Deploy to Production**: Set up proper hosting
5. **Add Security**: Implement production-ready policies

---

**Remember**: Always run the scripts in order and test each step before proceeding to the next!
