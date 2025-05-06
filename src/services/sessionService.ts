import dbConnect from '@/lib/mongodb'; // Import the connection utility
import Session, { ISession } from '@/models/Session'; // Import your Mongoose model
import redis from '@/config/redis';

// Make SessionData extend ISession to ensure compatibility, but allow other keys
interface SessionData extends Partial<ISession> {
  [key: string]: any;
}

const saveSession = async (sessionId: string, data: SessionData): Promise<void> => {
  await dbConnect(); // Call dbConnect() before database operations

  // Prepare data for Redis (ensure it's stringifiable)
  const redisData: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value instanceof Date) {
        redisData[key] = value.toISOString();
      } else if (typeof value !== 'function' && value !== undefined) {
        redisData[key] = value;
      }
    }
  }
  await redis.set(sessionId, JSON.stringify(redisData), 'EX', 3600); // Store in Redis

  // For MongoDB, use findOneAndUpdate with upsert:true
  try {
    await Session.findOneAndUpdate(
      { sessionId: sessionId }, // Query condition: find by our custom sessionId
      { ...data, sessionId: sessionId }, // Data to insert/update (ensure sessionId is part of the doc)
      { upsert: true, new: true, setDefaultsOnInsert: true } // Options
    );
    console.log(`Session ${sessionId} saved/updated in MongoDB.`);
  } catch (error) {
    console.error(`Error saving session ${sessionId} to MongoDB:`, error);
    // Optionally re-throw the error if the caller needs to know about DB failures
    // throw error;
  }
};

const getSession = async (sessionId: string): Promise<SessionData | null> => {
  const sessionString = await redis.get(sessionId);
  if (sessionString) {
    const sessionData = JSON.parse(sessionString) as SessionData;
    // Re-hydrate Date objects if they were stringified for Redis
    if (sessionData.otpExpiresAt && typeof sessionData.otpExpiresAt === 'string') {
      sessionData.otpExpiresAt = new Date(sessionData.otpExpiresAt);
    }
    if (sessionData.createdAt && typeof sessionData.createdAt === 'string') {
      sessionData.createdAt = new Date(sessionData.createdAt);
    }
    if (sessionData.updatedAt && typeof sessionData.updatedAt === 'string') {
      sessionData.updatedAt = new Date(sessionData.updatedAt);
    }
    return sessionData;
  }

  // Fallback to fetch from MongoDB if not in Redis
  console.log(`Session ${sessionId} not found in Redis. Attempting to fetch from MongoDB.`);
  await dbConnect();
  try {
    const mongoSession = await Session.findOne({ sessionId: sessionId });
    if (mongoSession) {
      console.log(`Session ${sessionId} retrieved from MongoDB.`);
      const plainMongoSession = mongoSession.toObject() as SessionData;
      
      // Prepare data for Redis (ensure it's stringifiable)
      const redisFallbackData: Record<string, any> = {};
      for (const key in plainMongoSession) {
        if (Object.prototype.hasOwnProperty.call(plainMongoSession, key)) {
          const value = plainMongoSession[key];
          if (value instanceof Date) {
            redisFallbackData[key] = value.toISOString();
          } else if (typeof value !== 'function' && value !== undefined) {
            redisFallbackData[key] = value;
          }
        }
      }
      await redis.set(sessionId, JSON.stringify(redisFallbackData), 'EX', 3600); // Cache it back to Redis
      return plainMongoSession;
    }
  } catch (error) {
    console.error(`Error fetching session ${sessionId} from MongoDB:`, error);
  }

  return null;
};

export { saveSession, getSession };
