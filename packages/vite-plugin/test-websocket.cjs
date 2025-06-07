const WebSocket = require('ws');

console.log('🧪 Starting WebSocket test client...');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server');
  
  // Send a test message
  const testMessage = {
    type: 'test-message',
    message: 'Hello from test client',
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(testMessage));
  console.log('📤 Sent test message:', testMessage);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📨 Received message:', parsed);
  } catch (error) {
    console.log('📨 Received raw message:', data.toString());
  }
});

ws.on('close', function close() {
  console.log('❌ WebSocket connection closed');
});

ws.on('error', function error(err) {
  console.error('🚨 WebSocket error:', err);
});

// Keep the process alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    const pingMessage = {
      type: 'ping',
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(pingMessage));
    console.log('🏓 Sent ping');
  }
}, 5000); 