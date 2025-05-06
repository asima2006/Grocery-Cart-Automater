import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('CRITICAL: REDIS_URL environment variable is not set.');
  // For a real application, ensure REDIS_URL is set in your environment (e.g., .env file)
  // Throwing an error here makes it clear that the application cannot proceed without Redis configuration.
  throw new Error('REDIS_URL is not defined. Please set it in your environment variables.');
}

const redis = new Redis(redisUrl);

redis.on('connect', () => {
  console.log('Successfully connected to Redis.');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Depending on your application's needs, you might want to implement
  // more sophisticated error handling or reconnection strategies here.
});

export default redis;