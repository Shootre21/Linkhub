import { db } from '@/lib/db';
import { headers } from 'next/headers';

// Parse user agent
function parseUserAgent(ua: string): { browser: string; os: string; device: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'BOT' | 'UNKNOWN' } {
  const browser = /chrome|safari|firefox|edge|opera|msie|trident/i.exec(ua)?.[0]?.toUpperCase() || 'UNKNOWN';
  const os = /windows|macintosh|linux|android|iphone|ipad/i.exec(ua)?.[0]?.toUpperCase() || 'UNKNOWN';
  
  let device: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'BOT' | 'UNKNOWN' = 'DESKTOP';
  
  if (/bot|crawl|slurp|spider/i.test(ua)) device = 'BOT';
  else if (/tablet|ipad|playbook|silk/i.test(ua)) device = 'TABLET';
  else if (/mobile|iphone|ipod|android/i.test(ua)) device = 'MOBILE';
  
  return { browser, os, device };
}

// Get network data from external service
async function getNetworkData(ipAddress?: string): Promise<{ country: string; city: string; isp: string }> {
  // If we have an IP, try to get geo data
  // For on-prem, we can skip external calls or use local GeoIP database
  return {
    country: 'Unknown',
    city: 'Unknown',
    isp: 'Unknown',
  };
}

// Track page view
export async function trackPageView(userId: string, referrer?: string) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const xForwardedFor = headersList.get('x-forwarded-for');
  const ip = xForwardedFor?.split(',')[0]?.trim() || '127.0.0.1';
  
  const { browser, os, device } = parseUserAgent(userAgent);
  const network = await getNetworkData(ip);
  
  return db.analytics.create({
    data: {
      userId,
      eventType: 'PAGE_VIEW',
      slug: 'page_visit',
      referrer: referrer || 'direct',
      userAgent,
      browser,
      os,
      device,
      country: network.country,
      city: network.city,
      ipAddress: ip,
      isp: network.isp,
    },
  });
}

// Track link click
export async function trackLinkClick(
  linkId: string,
  userId: string,
  url: string,
  slug: string,
  referrer?: string
) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const xForwardedFor = headersList.get('x-forwarded-for');
  const ip = xForwardedFor?.split(',')[0]?.trim() || '127.0.0.1';
  
  const { browser, os, device } = parseUserAgent(userAgent);
  const network = await getNetworkData(ip);
  
  // Increment click count
  await db.link.update({
    where: { id: linkId },
    data: { clickCount: { increment: 1 } },
  });
  
  return db.analytics.create({
    data: {
      linkId,
      userId,
      eventType: 'CLICK',
      slug,
      url,
      referrer: referrer || 'direct',
      userAgent,
      browser,
      os,
      device,
      country: network.country,
      city: network.city,
      ipAddress: ip,
      isp: network.isp,
    },
  });
}

// Get analytics summary for user
export async function getAnalyticsSummary(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const analytics = await db.analytics.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    include: { link: true },
  });
  
  // Aggregate data
  const pageViews = analytics.filter(a => a.eventType === 'PAGE_VIEW');
  const clicks = analytics.filter(a => a.eventType === 'CLICK');
  
  // Top links
  const linkClicks: Record<string, number> = {};
  clicks.forEach(a => {
    if (a.slug) {
      linkClicks[a.slug] = (linkClicks[a.slug] || 0) + 1;
    }
  });
  
  const topLinks = Object.entries(linkClicks)
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // By country
  const byCountry: Record<string, number> = {};
  analytics.forEach(a => {
    if (a.country) {
      byCountry[a.country] = (byCountry[a.country] || 0) + 1;
    }
  });
  
  const countryStats = Object.entries(byCountry)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // By device
  const byDevice: Record<string, number> = {};
  analytics.forEach(a => {
    byDevice[a.device] = (byDevice[a.device] || 0) + 1;
  });
  
  const deviceStats = Object.entries(byDevice)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);
  
  // By referrer
  const byReferrer: Record<string, number> = {};
  analytics.forEach(a => {
    if (a.referrer) {
      byReferrer[a.referrer] = (byReferrer[a.referrer] || 0) + 1;
    }
  });
  
  const referrerStats = Object.entries(byReferrer)
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Daily stats for chart
  const dailyStats: Record<string, { views: number; clicks: number }> = {};
  analytics.forEach(a => {
    const date = a.createdAt.toISOString().split('T')[0];
    if (!dailyStats[date]) dailyStats[date] = { views: 0, clicks: 0 };
    if (a.eventType === 'PAGE_VIEW') dailyStats[date].views++;
    else dailyStats[date].clicks++;
  });
  
  const dailyChart = Object.entries(dailyStats)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    totalPageViews: pageViews.length,
    totalClicks: clicks.length,
    uniqueVisitors: new Set(analytics.map(a => a.ipAddress)).size,
    topLinks,
    byCountry: countryStats,
    byDevice: deviceStats,
    byReferrer: referrerStats,
    dailyChart,
    recentEvents: analytics.slice(0, 50),
  };
}

// Get admin analytics (all users)
export async function getAdminAnalytics(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const analytics = await db.analytics.findMany({
    where: { createdAt: { gte: startDate } },
    include: { link: true, user: { include: { profile: true } } },
  });
  
  const users = await db.user.count();
  const links = await db.link.count();
  
  return {
    totalUsers: users,
    totalLinks: links,
    totalPageViews: analytics.filter(a => a.eventType === 'PAGE_VIEW').length,
    totalClicks: analytics.filter(a => a.eventType === 'CLICK').length,
    recentEvents: analytics.slice(0, 100),
  };
}
