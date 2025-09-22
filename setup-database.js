import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://thycdwdlanlgcvtedyvl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeWNkd2RsYW5sZ2N2dGVkeXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTY2MTUsImV4cCI6MjA3Mjk5MjYxNX0.Ncv9Dg4WdB0bf7FR8os8AfydL9kitqY_7lph9CaEBYM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  console.log('🚀 Setting up warehouse management database...');
  
  try {
    // Test connection first
    console.log('📡 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return;
    }
    
    console.log('✅ Connection successful!');
    
    // Create sizes table and data
    console.log('📋 Creating sizes table...');
    
    // First, try to create the sizes table using RPC or direct SQL
    const sizesSQL = `
      -- Create sizes table
      CREATE TABLE IF NOT EXISTS sizes (
          id VARCHAR(10) PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          "order" INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Insert default sizes
      INSERT INTO sizes (id, name, "order") VALUES 
      ('XS', 'Extra Small', 1),
      ('S', 'Small', 2),
      ('M', 'Medium', 3),
      ('L', 'Large', 4),
      ('XL', 'Extra Large', 5),
      ('XXL', 'Double Extra Large', 6)
      ON CONFLICT (id) DO NOTHING;
    `;
    
    // Try to execute using RPC function (if available)
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { sql: sizesSQL });
    
    if (rpcError) {
      console.log('⚠️  RPC method not available, trying alternative approach...');
      
      // Alternative: Try to insert data directly (assuming table exists)
      const sizesData = [
        { id: 'XS', name: 'Extra Small', order: 1 },
        { id: 'S', name: 'Small', order: 2 },
        { id: 'M', name: 'Medium', order: 3 },
        { id: 'L', name: 'Large', order: 4 },
        { id: 'XL', name: 'Extra Large', order: 5 },
        { id: 'XXL', name: 'Double Extra Large', order: 6 }
      ];
      
      const { error: sizesError } = await supabase
        .from('sizes')
        .upsert(sizesData, { onConflict: 'id' });
      
      if (sizesError) {
        console.error('❌ Failed to create sizes:', sizesError.message);
        console.log('\n🔧 MANUAL SETUP REQUIRED:');
        console.log('Please run the following SQL in your Supabase SQL Editor:');
        console.log('\n' + sizesSQL);
        return;
      }
    }
    
    console.log('✅ Sizes table created successfully!');
    
    // Test if we can read from sizes table
    const { data: sizesTest, error: sizesTestError } = await supabase
      .from('sizes')
      .select('*')
      .limit(1);
    
    if (sizesTestError) {
      console.error('❌ Cannot read from sizes table:', sizesTestError.message);
      console.log('\n🔧 MANUAL SETUP REQUIRED:');
      console.log('Please run the complete database schema from database-schema.sql in your Supabase SQL Editor.');
      return;
    }
    
    console.log('✅ Database setup completed successfully!');
    console.log('🎉 Your warehouse management system is ready to use!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 MANUAL SETUP REQUIRED:');
    console.log('Please run the SQL schema manually in your Supabase dashboard.');
  }
}

// Run the setup
setupDatabase();
