import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const profileSchema = z.object({
  displayName: z.string().max(100).optional(),
  customHandle: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/i).optional(),
  title: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  theme: z.enum(['DARK', 'LIGHT', 'GRADIENT', 'MINIMAL', 'CUSTOM']).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  buttonStyle: z.enum(['ROUNDED', 'SQUARE', 'PILLS', 'OUTLINED']).optional(),
  buttonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  showSocials: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(300).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      include: { socialLinks: { orderBy: { order: 'asc' } } },
    });
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const validated = profileSchema.parse(body);
    
    // Check if custom handle is taken by another user
    if (validated.customHandle) {
      const existingHandle = await db.profile.findFirst({
        where: {
          customHandle: validated.customHandle.toLowerCase(),
          NOT: { userId: user.id },
        },
      });
      
      if (existingHandle) {
        return NextResponse.json(
          { error: 'This handle is already taken' },
          { status: 400 }
        );
      }
    }
    
    const profile = await db.profile.update({
      where: { userId: user.id },
      data: {
        ...validated,
        customHandle: validated.customHandle?.toLowerCase(),
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
