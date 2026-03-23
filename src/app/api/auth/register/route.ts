import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie, generateUniqueUsername, generateUniqueHandle } from '@/lib/auth';
import { getAdminSettings } from '@/lib/settings';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-z0-9_]+$/i, 'Username can only contain letters, numbers, and underscores').optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const settings = await getAdminSettings();
    
    // Check if registration is allowed
    if (!settings.allowRegistration) {
      return NextResponse.json(
        { error: 'Registration is currently disabled' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validated = registerSchema.parse(body);
    
    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }
    
    // Generate username if not provided
    const username = validated.username || await generateUniqueUsername(validated.email);
    
    // Check if username is taken
    if (validated.username) {
      const existingUsername = await db.user.findUnique({
        where: { username: validated.username.toLowerCase() },
      });
      
      if (existingUsername) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 400 }
        );
      }
    }
    
    // Hash password
    const hashedPassword = hashPassword(validated.password);
    
    // Create user and profile in transaction
    const user = await db.user.create({
      data: {
        email: validated.email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        firstName: validated.firstName,
        lastName: validated.lastName,
        phone: validated.phone,
        role: settings.defaultUserRole,
        profile: {
          create: {
            displayName: validated.firstName && validated.lastName 
              ? `${validated.firstName} ${validated.lastName}`
              : username,
            customHandle: await generateUniqueHandle(username),
            primaryColor: settings.defaultPrimaryColor,
          },
        },
      },
      include: { profile: true },
    });
    
    // Create session
    const token = await createSession(user.id);
    await setSessionCookie(token);
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
