import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SESSION_COOKIE_NAME = 'linkhub_session';
const SESSION_DURATION_DAYS = 30;

// Password hashing utilities
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  
  const verifyHash = scryptSync(password, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

// Token generation
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Session management
export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  
  await db.session.create({
    data: {
      userId,
      token,
      userAgent,
      ipAddress,
      expiresAt,
    },
  });
  
  // Update last login
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
  
  return token;
}

export async function getSession(token: string) {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { profile: true } } },
  });
  
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { token } });
    return null;
  }
  
  return session;
}

export async function deleteSession(token: string) {
  try {
    await db.session.delete({ where: { token } });
  } catch {
    // Session might not exist
  }
}

// Cookie helpers
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Get current user from request
export async function getCurrentUser() {
  const token = await getSessionCookie();
  if (!token) return null;
  
  const session = await getSession(token);
  if (!session) {
    await clearSessionCookie();
    return null;
  }
  
  return session.user;
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'ADMIN';
}

// Generate unique username from email
export async function generateUniqueUsername(email: string): Promise<string> {
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  let username = baseUsername;
  let counter = 1;
  
  while (await db.user.findUnique({ where: { username } })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
}

// Generate unique handle
export async function generateUniqueHandle(baseHandle: string): Promise<string> {
  const handle = baseHandle.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  let finalHandle = handle;
  let counter = 1;
  
  while (await db.profile.findUnique({ where: { customHandle: finalHandle } })) {
    finalHandle = `${handle}${counter}`;
    counter++;
  }
  
  return finalHandle;
}
