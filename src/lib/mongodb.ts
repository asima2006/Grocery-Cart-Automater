import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local or your environment settings'
  );
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Extend the NodeJS Global type to include the mongoose cache
declare global {
  var mongooseCache: MongooseCache;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    console.log('MongoDB: Using cached connection.');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable command buffering if not connecting immediately
    };

    console.log('MongoDB: Creating new connection promise.');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log('MongoDB: Connection successful.');
      return mongooseInstance;
    }).catch(error => {
      console.error('MongoDB: Connection error:', error);
      cached.promise = null; // Reset promise on error
      throw error; // Re-throw error to be caught by caller
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Ensure promise is cleared on error
    throw e;
  }
  
  return cached.conn;
}

export default dbConnect;