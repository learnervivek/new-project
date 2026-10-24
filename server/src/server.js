import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5001;

async function startServer() {
  // Connect database
  await connectDB();

  // Start HTTP listener
  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 TripTally Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();

export default app;
