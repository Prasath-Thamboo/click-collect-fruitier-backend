const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Retry wrapper for Neon cold-start connection errors
const RETRYABLE_CODES = ['P1001', 'P1002', 'P1008', 'P1017'];

async function withRetry(fn, retries = 3, delayMs = 800) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        RETRYABLE_CODES.includes(err.errorCode) ||
        err.message?.includes("Can't reach database") ||
        err.message?.includes('Server has closed the connection');

      if (isRetryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
}

module.exports = { prisma, withRetry };
