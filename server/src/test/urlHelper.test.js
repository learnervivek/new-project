import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getClientUrl } from '../utils/urlHelper.js';

describe('getClientUrl Helper', () => {
  const originalClientUrl = process.env.CLIENT_URL;

  beforeEach(() => {
    delete process.env.CLIENT_URL;
  });

  afterEach(() => {
    if (originalClientUrl !== undefined) {
      process.env.CLIENT_URL = originalClientUrl;
    } else {
      delete process.env.CLIENT_URL;
    }
  });

  it('should return configured production CLIENT_URL if non-localhost', () => {
    process.env.CLIENT_URL = 'https://triptally.work.gd/';
    const result = getClientUrl();
    expect(result).toBe('https://triptally.work.gd');
  });

  it('should prioritize incoming request origin over a localhost CLIENT_URL', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const mockReq = {
      get: (header) => (header.toLowerCase() === 'origin' ? 'https://triptally.work.gd' : undefined),
    };
    const result = getClientUrl(mockReq);
    expect(result).toBe('https://triptally.work.gd');
  });

  it('should use referer header if origin is missing and CLIENT_URL is localhost', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const mockReq = {
      get: (header) => (header.toLowerCase() === 'referer' ? 'https://triptally.work.gd/trips/123' : undefined),
    };
    const result = getClientUrl(mockReq);
    expect(result).toBe('https://triptally.work.gd');
  });

  it('should use x-forwarded-host header if origin/referer are missing', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const mockReq = {
      protocol: 'https',
      get: (header) => {
        if (header.toLowerCase() === 'x-forwarded-host') return 'triptally.work.gd';
        if (header.toLowerCase() === 'x-forwarded-proto') return 'https';
        return undefined;
      },
    };
    const result = getClientUrl(mockReq);
    expect(result).toBe('https://triptally.work.gd');
  });

  it('should return localhost CLIENT_URL when running locally without live request headers', () => {
    process.env.CLIENT_URL = 'http://localhost:5173';
    const mockReq = {
      get: (header) => (header.toLowerCase() === 'origin' ? 'http://localhost:5173' : undefined),
    };
    const result = getClientUrl(mockReq);
    expect(result).toBe('http://localhost:5173');
  });

  it('should default to http://localhost:5173 when no CLIENT_URL and no req is passed', () => {
    const result = getClientUrl();
    expect(result).toBe('http://localhost:5173');
  });
});
