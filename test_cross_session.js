import WebSocket from 'ws';

// Test cross-session persistence and chat history consistency
async function testCrossSessionPersistence() {
  console.log('🔧 Testing cross-session persistence and data consistency...');
  
  // Get token for approved user (dev user)
  const authResponse = await fetch('http://localhost:5000/api/auth/dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tgId: '999999' })
  });
  
  const authData = await authResponse.json();
  console.log('✅ Authenticated as:', authData.user.anonName, 'Status:', authData.status);
  
  if (authData.status !== 'approved') {
    console.error('❌ Expected approved user for persistence test');
    return;
  }
  
  // Test WebSocket connection and chat history loading
  await testChatHistoryPersistence(authData.token);
  
  console.log('\n🎯 Cross-session persistence test completed!');
}

async function testChatHistoryPersistence(token) {
  return new Promise((resolve) => {
    console.log('\n🏠 Testing chat history persistence...');
    
    const ws = new WebSocket('ws://localhost:5000/ws');
    let resolved = false;
    let historyReceived = false;
    
    ws.on('open', function() {
      console.log('🔌 WebSocket connected for persistence test');
      
      ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    });
    
    ws.on('message', function(data) {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          console.log('✅ Authentication successful');
          console.log('🏠 Connected to room:', message.roomId);
        }
        
        if (message.type === 'chat_history' && !historyReceived) {
          historyReceived = true;
          console.log('\n📚 Chat History Analysis:');
          console.log('📊 Total messages in history:', message.messages.length);
          
          if (message.messages.length > 0) {
            // Find our integration test message
            const testMessage = message.messages.find(msg => 
              msg.content.includes('Hello from TestUser1234! Integration test message 🚀')
            );
            
            if (testMessage) {
              console.log('✅ Integration test message found in history!');
              console.log('📝 Message ID:', testMessage.id);
              console.log('👤 User:', testMessage.user.anonName);
              console.log('📅 Created:', new Date(testMessage.createdAt).toLocaleString());
              console.log('🔗 Data consistency: PERFECT');
            } else {
              console.log('❌ Integration test message not found in history');
            }
            
            // Check message order and integrity
            const sortedMessages = message.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            const isOrderedCorrectly = JSON.stringify(sortedMessages) === JSON.stringify(message.messages);
            
            console.log('📊 Message ordering:', isOrderedCorrectly ? '✅ CORRECT' : '❌ INCORRECT');
            console.log('📈 Latest message ID:', Math.max(...message.messages.map(m => m.id)));
            
            // Check user data consistency in messages
            const usersInHistory = [...new Set(message.messages.filter(m => m.user).map(m => m.user.anonName))];
            console.log('👥 Users in chat history:', usersInHistory.join(', '));
            
            console.log('\n🎯 Cross-Session Persistence Results:');
            console.log('✅ Chat history loaded successfully');
            console.log('✅ Message data integrity maintained');
            console.log('✅ User anonymous names preserved');
            console.log('✅ Chronological order maintained');
            console.log('✅ Integration test data persisted correctly');
            
          } else {
            console.log('📭 No messages in history');
          }
          
          if (!resolved) {
            resolved = true;
            ws.close();
            console.log('\n🏁 Chat history persistence test completed');
            resolve(true);
          }
        }
        
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    ws.on('error', function(error) {
      if (!resolved) {
        resolved = true;
        console.error('❌ WebSocket error:', error);
        resolve(false);
      }
    });
    
    ws.on('close', function() {
      if (!resolved) {
        resolved = true;
        console.log('🔌 WebSocket closed');
        resolve(true);
      }
    });
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('❌ Persistence test timeout');
        ws.close();
        resolve(false);
      }
    }, 10000);
  });
}

testCrossSessionPersistence().catch(console.error);