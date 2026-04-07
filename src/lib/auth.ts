import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is required');
  return secret;
}

function getPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD environment variable is required');
  return password;
}

function sign(payload: string): string {
  const hmac = createHmac('sha256', getSecret());
  hmac.update(payload);
  return hmac.digest('hex');
}

export function checkPassword(password: string): boolean {
  const expected = getPassword();
  if (password.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function createSessionCookie(): string {
  const payload = `authenticated:${Date.now()}`;
  const signature = sign(payload);
  const token = Buffer.from(`${payload}.${signature}`).toString('base64');
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function isAuthenticated(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  const session = cookies[COOKIE_NAME];
  if (!session) return false;

  try {
    const decoded = Buffer.from(session, 'base64').toString();
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return false;

    const payload = decoded.substring(0, lastDot);
    const signature = decoded.substring(lastDot + 1);

    // Verify HMAC signature
    const expectedSig = sign(payload);
    if (signature.length !== expectedSig.length) return false;
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) return false;

    // Check payload format
    if (!payload.startsWith('authenticated:')) return false;

    // Check expiration
    const timestamp = parseInt(payload.split(':')[1]);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > SESSION_MAX_AGE * 1000) return false;

    return true;
  } catch {
    return false;
  }
}
