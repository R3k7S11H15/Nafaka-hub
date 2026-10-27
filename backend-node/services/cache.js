let redisClient = null

function initRedis() {
  try {
    const redis = require('redis')
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    })
    redisClient.connect().catch(err => console.error('Redis connection failed:', err.message))
  } catch (err) {
    console.warn('Redis not available, caching disabled')
  }
}

async function getCache(key) {
  if (!redisClient) return null
  try {
    const value = await redisClient.get(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

async function setCache(key, value, ttlSeconds = 300) {
  if (!redisClient) return
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value))
  } catch (err) {
    console.error('Cache set error:', err.message)
  }
}

async function deleteCache(key) {
  if (!redisClient) return
  try {
    await redisClient.del(key)
  } catch (err) {
    console.error('Cache delete error:', err.message)
  }
}

async function clearPattern(pattern) {
  if (!redisClient) return
  try {
    const keys = await redisClient.keys(pattern)
    if (keys.length > 0) await redisClient.del(keys)
  } catch (err) {
    console.error('Cache clear error:', err.message)
  }
}

function getRedisClient() {
  return redisClient
}

module.exports = { initRedis, getCache, setCache, deleteCache, clearPattern, getRedisClient }