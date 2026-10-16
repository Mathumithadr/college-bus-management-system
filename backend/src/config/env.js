// Updated env.js — adds MONGO_URI_TEST for test isolation

import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/college_bus_management',
  MONGO_URI_TEST: process.env.MONGO_URI_TEST || process.env.MONGODB_URI || 'mongodb://localhost:27017/college_bus_management_test',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  LOCATION_STALE_THRESHOLD: parseInt(process.env.LOCATION_STALE_THRESHOLD || '120', 10),
};

const required = ['JWT_SECRET'];
required.forEach((key) => {
  if (!env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});