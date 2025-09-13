import WebSocket from 'ws';

// Helper function to get test token from dev auth endpoint
async function getTestToken() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tgId: '999999' })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.log('Could not obtain test token from dev endpoint:', error.message);
  }
  return null;
}

// Test WebSocket connection with approved user
async function testWebSocket() {
  // NOTE: For security, obtain token dynamically from /api/auth/dev endpoint
  const token = process.env.TEST_WEBSOCKET_TOKEN || await getTestToken();
  
  if (!token) {
    console.log('⚠️  Skipping WebSocket test - no valid token available');
    console.log('💡 Set TEST_WEBSOCKET_TOKEN environment variable or ensure dev auth endpoint is available');
    return;
  }
  
  const ws = new WebSocket('ws://localhost:5000/ws');
  
  ws.on('open', function() {
    console.log('✅ WebSocket connected successfully');
    
    // Authenticate with TestUser1234's token
    ws.send(JSON.stringify({
      type: 'auth',
      token: token
    }));
  });
  
  ws.on('message', function(data) {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message);
      
      if (message.type === 'auth_success') {
        console.log('✅ Authentication successful! User:', message.user);
        console.log('🏠 Room ID:', message.roomId);
        
        // Send a test message
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'send_message',
            content: 'Hello from TestUser1234! Integration test message 🚀',
            roomId: message.roomId
          }));
          console.log('📤 Sent test message');
        }, 1000);
      }
      
      if (message.type === 'new_message') {
        console.log('✅ Message successfully sent and received!');
        console.log('👤 From:', message.message.user.anonName);
        console.log('💬 Content:', message.message.content);
        
        // Test complete - close connection
        setTimeout(() => {
          ws.close();
          console.log('🎯 WebSocket test completed successfully!');
        }, 1000);
      }
      
      if (message.type === 'auth_error') {
        console.error('❌ Auth error:', message.message);
        ws.close();
      }
      
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('error', function(error) {
    console.error('❌ WebSocket error:', error);
  });
  
  ws.on('close', function() {
    console.log('🔌 WebSocket connection closed');
  });
}

testWebSocket().catch(console.error);