// Simple script to start the server and catch errors
import('./server.js')
  .then(() => {
    console.log('Server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start server:');
    console.error(error);
    process.exit(1);
  });

