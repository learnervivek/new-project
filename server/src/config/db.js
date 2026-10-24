import mongoose from 'mongoose';

let cachedPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedPromise) {
    try {
      await cachedPromise;
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }
    } catch {
      cachedPromise = null;
    }
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/triptally';

  cachedPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
  });

  try {
    const conn = await cachedPromise;
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    cachedPromise = null;
    console.warn(`[MongoDB] Warning: Could not connect to MongoDB at ${uri}.`);
    console.warn(`[MongoDB] Detail: ${err.message}`);
    throw err;
  }
}

export function getDBStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    isConnected: stateCode === 1,
  };
}

export default connectDB;
