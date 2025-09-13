import WebSocket from 'ws';

// Test that old approved tokens are invalidated when user status changes to rejected
async function testTokenInvalidation() {
  console.log('🔧 Testing token invalidation after status change...');
  
  // NOTE: This test requires tokens from a previously approved user that was then rejected
  // In production, obtain these tokens dynamically through proper authentication flow
  const oldApprovedToken = process.env.TEST_OLD_APPROVED_TOKEN || 'PLACEHOLDER_TOKEN_REMOVED_FOR_SECURITY';
  const oldRefreshToken = process.env.TEST_OLD_REFRESH_TOKEN || 'PLACEHOLDER_TOKEN_REMOVED_FOR_SECURITY';
  
  if (oldApprovedToken === 'PLACEHOLDER_TOKEN_REMOVED_FOR_SECURITY') {
    console.log('⚠️  Skipping token invalidation test - hardcoded tokens removed for security');
    console.log('💡 To run this test, set TEST_OLD_APPROVED_TOKEN and TEST_OLD_REFRESH_TOKEN environment variables');
    return;
  }
  
  console.log('\n📋 Status: TestUser1234 was APPROVED when tokens were issued');
  console.log('📋 Status: TestUser1234 is now REJECTED in database');
  console.log('📋 Test: Old approved tokens should be INVALIDATED');
  
  // Test 1: Try to authenticate new session with old approved token (should get rejected status)
  console.log('\n🧪 Test 1: Current authentication with rejected user');
  const authResponse = await fetch('http://localhost:5000/api/auth/dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tgId: '123456789' })
  });
  
  const currentAuth = await authResponse.json();
  console.log('🔍 Current auth status:', currentAuth.status);
  
  if (currentAuth.status === 'rejected') {
    console.log('✅ Database status is correctly rejected');
  } else {
    console.error('❌ Expected rejected status, got:', currentAuth.status);
    return;
  }
  
  // Test 2: Try WebSocket connection with old approved token
  console.log('\n🧪 Test 2: WebSocket connection with old approved token');
  const wsResult = await testWebSocketWithOldToken(oldApprovedToken);
  
  // Test 3: Try refresh token with old refresh token  
  console.log('\n🧪 Test 3: Refresh token validation');
  await testRefreshTokenValidation(oldRefreshToken);
  
  console.log('\n🎯 Token invalidation test completed!');
  console.log('🛡️  Security Summary: Old tokens should be invalidated when status changes');
}

async function testWebSocketWithOldToken(oldToken) {
  return new Promise((resolve) => {
    console.log('🔌 Testing WebSocket with old approved token...');
    
    const ws = new WebSocket('ws://localhost:5000/ws');
    let resolved = false;
    
    ws.on('open', function() {
      console.log('📡 WebSocket connected');
      
      ws.send(JSON.stringify({
        type: 'auth',
        token: oldToken
      }));
      console.log('📤 Sent old approved token for authentication');
    });
    
    ws.on('message', function(data) {
      if (resolved) return;
      resolved = true;
      
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 WebSocket response:', message);
        
        if (message.type === 'auth_error') {
          console.log('✅ CORRECT: WebSocket auth failed with old token');
          console.log('🛡️  Reason:', message.message);
          console.log('🔒 Security working: Status change invalidated old tokens');
          ws.close();
          resolve(true);
        } else if (message.type === 'auth_success') {
          console.error('❌ SECURITY ISSUE: Old token still worked after status change!');
          console.error('🚨 This is a major security vulnerability!');
          ws.close();
          resolve(false);
        }
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.close();
        resolve(false);
      }
    });
    
    ws.on('error', function(error) {
      if (resolved) return;
      resolved = true;
      console.log('⚠️  WebSocket error:', error.message);
      resolve(false);
    });
    
    ws.on('close', function(code, reason) {
      if (resolved) return;
      resolved = true;
      console.log('🔌 WebSocket closed:', code, reason.toString());
      resolve(true);
    });
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('❌ WebSocket test timeout');
        ws.close();
        resolve(false);
      }
    }, 5000);
  });
}

async function testRefreshTokenValidation(oldRefreshToken) {
  console.log('🔄 Testing old refresh token...');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefreshToken })
    });
    
    const data = await response.json();
    console.log('📨 Refresh response:', { ok: response.ok, status: response.status });
    
    if (!response.ok) {
      console.log('✅ CORRECT: Refresh token failed after status change');
      console.log('🛡️  Error:', data.error);
      console.log('🔒 Security working: Status change invalidated refresh tokens');
    } else {
      console.error('❌ SECURITY ISSUE: Old refresh token still worked!');
      console.error('🚨 User can still refresh tokens after status change!');
      console.error('📋 New auth data:', data);
    }
    
  } catch (error) {
    console.error('Error testing refresh token:', error);
  }
}

testTokenInvalidation().catch(console.error);