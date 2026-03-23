import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProfilePage } from '@/components/profile-page';

interface PageProps {
  params: Promise<{ handle: string }>;
}

// Generate static params for popular profiles
export async function generateStaticParams() {
  const profiles = await db.profile.findMany({
    where: { isPublic: true },
    select: { customHandle: true },
    take: 100,
  });
  
  return profiles.map((profile) => ({
    handle: profile.customHandle,
  }));
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle } = await params;
  
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
          avatar: true,
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
    notFound();
  }
  
  return <ProfilePage profile={profile} />;
}
