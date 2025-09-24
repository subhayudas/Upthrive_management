#!/usr/bin/env node

/**
 * Deployment Verification Script
 * This script verifies that all critical components are working
 */

require('dotenv').config();

const https = require('https');
const http = require('http');

// Test configurations
const tests = [
  {
    name: 'Environment Variables',
    test: () => {
      const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
      const missing = required.filter(env => !process.env[env]);
      if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}`);
      }
      return 'All required environment variables are set';
    }
  },
  {
    name: 'Supabase Connection',
    test: async () => {
      const { supabase } = require('./config/supabase');
      
      // Test connection with a simple query
      const { data, error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      return 'Supabase connection successful';
    }
  },
  {
    name: 'Node.js Version',
    test: () => {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      
      if (majorVersion < 20) {
        throw new Error(`Node.js version ${version} is not supported. Requires Node.js 20+`);
      }
      
      return `Node.js ${version} is supported`;
    }
  },
  {
    name: 'Dependencies',
    test: () => {
      try {
        require('@supabase/supabase-js');
        require('express');
        require('cors');
        require('helmet');
        require('jsonwebtoken');
        return 'All dependencies loaded successfully';
      } catch (error) {
        throw new Error(`Dependency loading failed: ${error.message}`);
      }
    }
  }
];

// Test health endpoint if URL is provided
if (process.argv[2]) {
  const url = process.argv[2];
  tests.push({
    name: 'Health Endpoint',
    test: () => {
      return new Promise((resolve, reject) => {
        const request = url.startsWith('https') ? https : http;
        
        const req = request.get(`${url}/api/health`, { timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const response = JSON.parse(data);
                if (response.status === 'OK') {
                  resolve('Health endpoint responding correctly');
                } else {
                  reject(new Error('Health endpoint returned non-OK status'));
                }
              } catch (e) {
                reject(new Error('Health endpoint returned invalid JSON'));
              }
            } else {
              reject(new Error(`Health endpoint returned status ${res.statusCode}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(new Error(`Health endpoint request failed: ${error.message}`));
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Health endpoint request timed out'));
        });
      });
    }
  });
}

// Run tests
async function runTests() {
  console.log('🔍 Running deployment verification tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(`✅ ${test.name}: ${result}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Deployment verification failed');
    process.exit(1);
  } else {
    console.log('✅ All deployment verification tests passed');
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('💥 Verification script error:', error);
  process.exit(1);
});
