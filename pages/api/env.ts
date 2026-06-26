import type { NextApiRequest, NextApiResponse } from 'next';

// Simple in-memory cache for environment variables
let envCache: Record<string, string | undefined> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Runtime Environment Variables API
 * Serves environment variables that can be injected at container runtime
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const now = Date.now();

    // Check cache first
    if (envCache && now - cacheTimestamp < CACHE_TTL) {
      // Set cache headers
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(envCache);
    }

    // Build environment variables object
    const publicEnvVars: Record<string, string | undefined> = {
      // Add any safe public environment variables here
    };

    // Update cache
    envCache = publicEnvVars;
    cacheTimestamp = now;

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(publicEnvVars);
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
