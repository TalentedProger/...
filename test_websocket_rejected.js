import WebSocket from 'ws';

// Test WebSocket connection with rejected user (should fail)
async function testRejectedWebSocket() {
  console.log('🔧 Testing WebSocket with rejected user...');
  
  // Get rejected user token first
  const authResponse = await fetch('http://localhost:5000/api/auth/dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tgId: '987654321' })
  });
  
  const authData = await authResponse.json();
  console.log('🔑 Auth data for rejected user:', authData);
  
  if (authData.status !== 'rejected') {
    console.error('❌ Expected rejected status, got:', authData.status);
    return;
  }
  
  const token = authData.token;
  const ws = new WebSocket('ws://localhost:5000/ws');
  
  ws.on('open', function() {
    console.log('🔌 WebSocket connected (this is expected)');
    
    // Try to authenticate with rejected user's token
    ws.send(JSON.stringify({
      type: 'auth',
      token: token
    }));
    console.log('📤 Sent auth request with rejected user token');
  });
  
  ws.on('message', function(data) {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message);
      
      if (message.type === 'auth_error') {
        console.log('✅ EXPECTED: Auth error for rejected user:', message.message);
        console.log('🛡️  Security working correctly - rejected users blocked');
        
        // Test complete
        setTimeout(() => {
          ws.close();
          console.log('🎯 Rejected user WebSocket test completed successfully!');
        }, 500);
      }
      
      if (message.type === 'auth_success') {
        console.error('❌ UNEXPECTED: Rejected user was authenticated!');
        console.error('🚨 SECURITY ISSUE: Rejected users should not be able to connect');
        ws.close();
      }
      
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('error', function(error) {
    console.log('⚠️  WebSocket error (this might be expected):', error.message);
  });
  
  ws.on('close', function(code, reason) {
    console.log('🔌 WebSocket connection closed:', code, reason.toString());
  });
}

testRejectedWebSocket().catch(console.error);