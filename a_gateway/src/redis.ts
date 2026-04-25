import Redis from "ioredis";




// 1. Setup Redis Connection
export const redis = new Redis({
  enableOfflineQueue: false,
});

