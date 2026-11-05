import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export function getDeviceAuthError(request: NextRequest): Response | null {
  const expected = process.env.ZENO_DEVICE_API_KEY;
  if (!expected) {
    return Response.json({ error: 'Device API authentication is not configured.' }, { status: 503 });
  }

  const supplied =
    request.headers.get('x-device-api-key') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!supplied) {
    return Response.json({ error: 'Device authentication required.' }, { status: 401 });
  }

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return Response.json({ error: 'Invalid device credentials.' }, { status: 401 });
  }

  return null;
}

export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
