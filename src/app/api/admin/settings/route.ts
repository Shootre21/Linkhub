import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAdminSettings, updateAdminSettings } from '@/lib/settings';
import { z } from 'zod';

const settingsSchema = z.object({
  siteName: z.string().max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  siteLogo: z.string().url().optional().or(z.literal('')),
  siteFavicon: z.string().url().optional().or(z.literal('')),
  domain: z.string().max(255).optional(),
  allowRegistration: z.boolean().optional(),
  requireEmailVerify: z.boolean().optional(),
  defaultTheme: z.enum(['DARK', 'LIGHT', 'GRADIENT', 'MINIMAL', 'CUSTOM']).optional(),
  defaultPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  defaultButtonStyle: z.enum(['ROUNDED', 'SQUARE', 'PILLS', 'OUTLINED']).optional(),
  maxLinksPerUser: z.number().int().min(1).max(1000).optional(),
  maxFileSize: z.number().int().min(1).optional(),
  smtpHost: z.string().max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPassword: z.string().max(255).optional(),
  smtpFromEmail: z.string().email().optional().or(z.literal('')),
  trackIPs: z.boolean().optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
  footerText: z.string().max(500).optional(),
  showPoweredBy: z.boolean().optional(),
  customHeadHTML: z.string().optional(),
  customBodyHTML: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const settings = await getAdminSettings();
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get admin settings error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validated = settingsSchema.parse(body);
    
    const settings = await updateAdminSettings(validated);
    
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Update admin settings error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
