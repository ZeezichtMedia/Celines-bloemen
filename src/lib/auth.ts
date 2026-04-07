const COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

function getPassword(): string {
  return process.env.ADMIN_PASSWORD || 'celine2024';
}

export function checkPassword(password: string): boolean {
  return password === getPassword();
}

export function createSessionCookie(): string {
  const token = Buffer.from(`authenticated:${Date.now()}`).toString('base64');
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
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
    return decoded.startsWith('authenticated:');
  } catch {
    return false;
  }
}
