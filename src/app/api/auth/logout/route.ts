import { NextResponse } from 'next/server';
import { deleteSession, clearSessionCookie, getSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    const token = await getSessionCookie();
    if (token) {
      await deleteSession(token);
    }
    await clearSessionCookie();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
