import { getDBStatus } from '../config/db.js';

export function getHealth(req, res) {
  const dbStatus = getDBStatus();

  res.status(200).json({
    success: true,
    message: 'TripTally API is operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbStatus.state,
      connected: dbStatus.isConnected,
    },
  });
}
