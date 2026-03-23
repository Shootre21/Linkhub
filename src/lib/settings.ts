import { db } from '@/lib/db';

// Get admin settings (create default if not exists)
export async function getAdminSettings() {
  let settings = await db.adminSettings.findFirst();
  
  if (!settings) {
    settings = await db.adminSettings.create({
      data: {},
    });
  }
  
  return settings;
}

// Update admin settings
export async function updateAdminSettings(data: Partial<{
  siteName: string;
  siteDescription: string;
  siteLogo: string;
  siteFavicon: string;
  domain: string;
  allowRegistration: boolean;
  requireEmailVerify: boolean;
  defaultTheme: string;
  defaultPrimaryColor: string;
  defaultButtonStyle: string;
  maxLinksPerUser: number;
  maxFileSize: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  trackIPs: boolean;
  retentionDays: number;
  footerText: string;
  showPoweredBy: boolean;
  customHeadHTML: string;
  customBodyHTML: string;
}>) {
  const current = await getAdminSettings();
  
  return db.adminSettings.update({
    where: { id: current.id },
    data,
  });
}

// Get site URL based on settings
export async function getSiteUrl() {
  const settings = await getAdminSettings();
  
  if (settings.domain) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${protocol}://${settings.domain}`;
  }
  
  // Fallback to environment variable or default
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

// Generate public profile URL
export async function getProfileUrl(handle: string) {
  const baseUrl = await getSiteUrl();
  return `${baseUrl}/${handle}`;
}
