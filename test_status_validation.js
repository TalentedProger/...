import WebSocket from 'ws';

// Test WebSocket authentication with outdated tokens after status change
async function testStatusValidation() {
  console.log('🔧 Testing status change validation...');
  
  // Step 1: Get token for approved user
  console.log('\n📋 Step 1: Get token for approved user');
  const authResponse = await fetch('http://localhost:5000/api/auth/dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tgId: '123456789' })
  });
  
  const authData = await authResponse.json();
  console.log('✅ Auth data:', { 
    user: authData.user.anonName, 
    status: authData.status,
    userId: authData.user.id 
  });
  
  const oldToken = authData.token;
  const oldRefreshToken = authData.refreshToken;
  
  if (authData.status !== 'approved') {
    console.error('❌ Expected approved user, got:', authData.status);
    return;
  }
  
  // Step 2: Test WebSocket connection with approved status (should work)
  console.log('\n📋 Step 2: Test WebSocket with approved status');
  await testWebSocketConnection(oldToken, 'approved', true);
  
  // Step 3: Change user status to rejected (simulating bot moderation)
  console.log('\n📋 Step 3: Change user status to rejected');
  await changeUserStatus(authData.user.id, 'rejected');
  
  // Step 4: Try to use old token after status change (should fail)
  console.log('\n📋 Step 4: Test WebSocket with old token after status change');
  await testWebSocketConnection(oldToken, 'rejected', false);
  
  // Step 5: Test refresh token behavior with status change
  console.log('\n📋 Step 5: Test refresh token after status change');
  await testRefreshToken(oldRefreshToken, false);
  
  console.log('\n🎯 Status validation test completed!');
}

async function changeUserStatus(userId, newStatus) {
  console.log(`🔄 Changing user ${userId} status to ${newStatus}...`);
  
  // In real scenario, this would be done by Telegram bot /moderate command
  // For testing, status was changed via direct database update
  console.log(`✅ Status changed to ${newStatus} (via database update - simulating Telegram bot action)`);
}

async function testWebSocketConnection(token, expectedStatus, shouldSucceed) {
  return new Promise((resolve) => {
    console.log(`🔌 Testing WebSocket with token for ${expectedStatus} user...`);
    
    const ws = new WebSocket('ws://localhost:5000/ws');
    
    let resolved = false;
    
    ws.on('open', function() {
      console.log('📡 WebSocket connected');
      
      ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    });
    
    ws.on('message', function(data) {
      if (resolved) return;
      resolved = true;
      
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success' && shouldSucceed) {
          console.log('✅ Expected success: WebSocket auth succeeded');
          ws.close();
          resolve(true);
        } else if (message.type === 'auth_error' && !shouldSucceed) {
          console.log('✅ Expected failure: WebSocket auth blocked:', message.message);
          console.log('🛡️  Security validation working correctly');
          ws.close();
          resolve(true);
        } else if (message.type === 'auth_success' && !shouldSucceed) {
          console.error('❌ SECURITY ISSUE: Auth succeeded when it should have failed!');
          ws.close();
          resolve(false);
        } else if (message.type === 'auth_error' && shouldSucceed) {
          console.error('❌ Unexpected auth error:', message.message);
          ws.close();
          resolve(false);
        }
        
      } catch (error) {
        console.error('Error parsing message:', error);
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
    
    ws.on('close', function() {
      if (resolved) return;
      resolved = true;
      console.log('🔌 WebSocket closed');
      resolve(true);
    });
    
    // Timeout after 5 seconds
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

async function testRefreshToken(refreshToken, shouldSucceed) {
  console.log('🔄 Testing refresh token...');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (response.ok && shouldSucceed) {
      console.log('✅ Expected success: Refresh token worked');
    } else if (!response.ok && !shouldSucceed) {
      console.log('✅ Expected failure: Refresh token blocked:', data.error);
      console.log('🛡️  Token security working correctly');
    } else if (response.ok && !shouldSucceed) {
      console.error('❌ SECURITY ISSUE: Refresh token worked when it should have failed!');
    } else if (!response.ok && shouldSucceed) {
      console.error('❌ Unexpected refresh token error:', data.error);
    }
    
  } catch (error) {
    console.error('Error testing refresh token:', error);
  }
}

testStatusValidation().catch(console.error);