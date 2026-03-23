import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getAdminSettings } from '@/lib/settings';
import { z } from 'zod';

const linkSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  url: z.string().url('Must be a valid URL'),
  description: z.string().max(200).optional(),
  icon: z.string().max(50).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
  order: z.number().int().optional(),
});

// Get all links for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const links = await db.link.findMany({
      where: { userId: user.id },
      orderBy: { order: 'asc' },
    });
    
    return NextResponse.json({ links });
  } catch (error) {
    console.error('Get links error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Create new link
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const settings = await getAdminSettings();
    const existingLinks = await db.link.count({ where: { userId: user.id } });
    
    if (existingLinks >= settings.maxLinksPerUser) {
      return NextResponse.json(
        { error: `Maximum of ${settings.maxLinksPerUser} links allowed` },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const validated = linkSchema.parse(body);
    
    // Get max order
    const maxOrder = await db.link.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    
    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    
    const link = await db.link.create({
      data: {
        ...validated,
        userId: user.id,
        profileId: profile!.id,
        order: validated.order ?? (maxOrder?.order ?? 0) + 1,
      },
    });
    
    return NextResponse.json({ link });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Create link error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Update link order (batch)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { orders } = z.object({
      orders: z.array(z.object({ id: z.string(), order: z.number() })),
    }).parse(body);
    
    // Update orders in transaction
    await db.$transaction(
      orders.map(({ id, order }) =>
        db.link.updateMany({
          where: { id, userId: user.id },
          data: { order },
        })
      )
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update link order error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
