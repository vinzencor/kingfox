-- Store Security Policies and Row Level Security
-- Run this script in your Supabase SQL Editor

-- Drop existing policies to recreate them with proper store isolation
DROP POLICY IF EXISTS "Allow all operations" ON store_inventory;
DROP POLICY IF EXISTS "Allow all operations" ON sales_transactions;
DROP POLICY IF EXISTS "Allow all operations" ON stores;
DROP POLICY IF EXISTS "Allow all operations" ON categories;
DROP POLICY IF EXISTS "Allow all operations" ON variants;
DROP POLICY IF EXISTS "Allow all operations" ON colors;
DROP POLICY IF EXISTS "Allow all operations" ON size_stock;
DROP POLICY IF EXISTS "Allow all operations" ON sizes;
DROP POLICY IF EXISTS "Allow all operations" ON barcode_groups;
DROP POLICY IF EXISTS "Allow all operations" ON warehouse_inventory;
DROP POLICY IF EXISTS "Allow all operations" ON product_photos;

-- Create function to get current store user's store_id from session
CREATE OR REPLACE FUNCTION get_current_store_id()
RETURNS UUID AS $$
DECLARE
    store_id UUID;
BEGIN
    -- This would be set by the application when a store user logs in
    -- For now, we'll allow all operations for service role
    IF auth.role() = 'service_role' THEN
        RETURN NULL; -- Allow all access for service role
    END IF;
    
    -- In a real implementation, you would get this from the JWT token or session
    -- For now, return NULL to allow all access
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simplified policies that allow all operations for service role
-- This is suitable for development and testing

-- Store inventory policies
CREATE POLICY "Allow all store inventory operations" ON store_inventory
    FOR ALL USING (auth.role() = 'service_role' OR true);

-- Sales transactions policies
CREATE POLICY "Allow all sales operations" ON sales_transactions
    FOR ALL USING (auth.role() = 'service_role' OR true);

-- Store policies
CREATE POLICY "Allow all store operations" ON stores
    FOR ALL USING (auth.role() = 'service_role' OR true);

-- Product-related policies
CREATE POLICY "Allow all category operations" ON categories
    FOR ALL USING (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow all variant operations" ON variants
    FOR ALL USING (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow all color operations" ON colors
    FOR ALL USING (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow all size_stock operations" ON size_stock
    FOR ALL USING (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow all size operations" ON sizes
    FOR ALL USING (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow all barcode_group operations" ON barcode_groups
    FOR ALL USING (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow all warehouse_inventory operations" ON warehouse_inventory
    FOR ALL USING (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow all product_photo operations" ON product_photos
    FOR ALL USING (auth.role() = 'service_role' OR true);

-- Create function to validate store access
CREATE OR REPLACE FUNCTION validate_store_access(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Service role has full access
    IF auth.role() = 'service_role' THEN
        RETURN TRUE;
    END IF;
    
    -- For now, allow all access (in production, implement proper validation)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table for tracking store operations
CREATE TABLE IF NOT EXISTS store_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES stores(id),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE store_audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policy
CREATE POLICY "Stores can only see their own audit logs" ON store_audit_log
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        store_id = get_current_store_id()
    );

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_store_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log for store-specific tables
    IF TG_TABLE_NAME IN ('store_inventory', 'sales_transactions') THEN
        INSERT INTO store_audit_log (
            store_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values
        ) VALUES (
            COALESCE(NEW.store_id, OLD.store_id),
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
DROP TRIGGER IF EXISTS audit_store_inventory ON store_inventory;
CREATE TRIGGER audit_store_inventory
    AFTER INSERT OR UPDATE OR DELETE ON store_inventory
    FOR EACH ROW EXECUTE FUNCTION audit_store_changes();

DROP TRIGGER IF EXISTS audit_sales_transactions ON sales_transactions;
CREATE TRIGGER audit_sales_transactions
    AFTER INSERT OR UPDATE OR DELETE ON sales_transactions
    FOR EACH ROW EXECUTE FUNCTION audit_store_changes();
