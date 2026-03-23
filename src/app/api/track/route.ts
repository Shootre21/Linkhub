import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackLinkClick, trackPageView } from '@/lib/analytics';
import { z } from 'zod';

const trackSchema = z.object({
  type: z.enum(['page_view', 'click']),
  linkId: z.string().optional(),
  userId: z.string(),
  url: z.string().optional(),
  slug: z.string().optional(),
  referrer: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = trackSchema.parse(body);
    
    if (validated.type === 'page_view') {
      await trackPageView(validated.userId, validated.referrer);
    } else if (validated.type === 'click' && validated.linkId && validated.url && validated.slug) {
      await trackLinkClick(
        validated.linkId,
        validated.userId,
        validated.url,
        validated.slug,
        validated.referrer
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Get public profile for tracking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');
    
    if (!handle) {
      return NextResponse.json(
        { error: 'Handle is required' },
        { status: 400 }
      );
    }
    
    const profile = await db.profile.findUnique({
      where: {
        customHandle: handle.toLowerCase(),
        isPublic: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bio: true,
          },
        },
        links: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        socialLinks: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Track page view
    await trackPageView(profile.userId, request.headers.get('referer') || undefined);
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get public profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
