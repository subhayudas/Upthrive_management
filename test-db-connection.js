const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Database Connection...');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabase() {
  try {
    console.log('\n📊 Testing database connection...');
    
    // Test 1: Check if cc_list table exists and get its structure
    console.log('\n1. Checking cc_list table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'cc_list');
    
    if (columnsError) {
      console.error('❌ Error checking table structure:', columnsError);
    } else {
      console.log('✅ cc_list table columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check if scheduled_date column exists
      const hasScheduledDate = columns.some(col => col.column_name === 'scheduled_date');
      console.log(`\n📅 scheduled_date column: ${hasScheduledDate ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    // Test 2: Check if there are any CC list items
    console.log('\n2. Checking for existing CC list items...');
    const { data: ccItems, error: ccError } = await supabase
      .from('cc_list')
      .select('*')
      .limit(5);
    
    if (ccError) {
      console.error('❌ Error fetching CC list items:', ccError);
    } else {
      console.log(`✅ Found ${ccItems.length} CC list items`);
      if (ccItems.length > 0) {
        console.log('Sample item:', JSON.stringify(ccItems[0], null, 2));
      }
    }
    
    // Test 3: Check clients table
    console.log('\n3. Checking clients table...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (clientsError) {
      console.error('❌ Error fetching clients:', clientsError);
    } else {
      console.log(`✅ Found ${clients.length} clients`);
      if (clients.length > 0) {
        console.log('Sample client:', JSON.stringify(clients[0], null, 2));
      }
    }
    
    // Test 4: Check profiles table
    console.log('\n4. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      console.log(`✅ Found ${profiles.length} profiles`);
      if (profiles.length > 0) {
        console.log('Sample profile:', JSON.stringify(profiles[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();
