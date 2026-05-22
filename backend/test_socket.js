const { io } = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Try to authenticate or join if needed
  // For sending a message, we might need a valid token. Let's assume testing without auth might fail, but let's see.
  socket.emit('send_message', {
    forumId: 6, // from real DB
    content: '',
    eventData: {
      name: 'Test Socket',
      description: 'Desc',
      start_at: '2026-05-04T10:00:00.000Z',
      end_at: null,
      location: 'Loc',
      call_link: ''
    }
  });

  console.log('Emitted send_message');
  
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('new_message', (msg) => {
  console.log('Received new_message:', msg);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
});
