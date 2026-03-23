'use client';

import { Profile, Link, SocialLink, User } from '@prisma/client';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileWithRelations extends Profile {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'bio' | 'avatar'>;
  links: Link[];
  socialLinks: SocialLink[];
}

interface ProfilePageProps {
  profile: ProfileWithRelations;
}

const themeBackgrounds: Record<string, string> = {
  DARK: 'bg-slate-950',
  LIGHT: 'bg-gray-50',
  GRADIENT: 'bg-gradient-to-br from-violet-900 via-purple-900 to-slate-900',
  MINIMAL: 'bg-white',
  CUSTOM: '',
};

const buttonStyles: Record<string, string> = {
  ROUNDED: 'rounded-xl',
  SQUARE: 'rounded-none',
  PILLS: 'rounded-full',
  OUTLINED: 'rounded-xl border-2 bg-transparent',
};

export function ProfilePage({ profile }: ProfilePageProps) {
  const displayName = profile.displayName || 
    [profile.user.firstName, profile.user.lastName].filter(Boolean).join(' ') ||
    profile.customHandle;

  const handleTrackClick = async (link: Link) => {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'click',
          linkId: link.id,
          userId: profile.userId,
          url: link.url,
          slug: link.id,
        }),
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  };

  const bgColor = profile.backgroundColor || (profile.theme === 'LIGHT' || profile.theme === 'MINIMAL' ? '#ffffff' : '#0f172a');
  const textColor = profile.textColor || (profile.theme === 'LIGHT' || profile.theme === 'MINIMAL' ? '#1f2937' : '#ffffff');
  const primaryColor = profile.primaryColor || '#3b82f6';
  const btnColor = profile.buttonColor || primaryColor;

  return (
    <div 
      className="min-h-screen w-full py-12 px-4"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* Cover Image */}
      {profile.coverImage && (
        <div 
          className="fixed top-0 left-0 right-0 h-64 bg-cover bg-center"
          style={{ backgroundImage: `url(${profile.coverImage})` }}
        />
      )}

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-28 h-28 rounded-full overflow-hidden border-4 shadow-lg"
            style={{ borderColor: primaryColor }}
          >
            {profile.avatar || profile.user.avatar ? (
              <img 
                src={profile.avatar || profile.user.avatar || ''} 
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-4xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name & Handle */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
          {profile.customHandle && (
            <p className="text-sm opacity-60">@{profile.customHandle}</p>
          )}
        </div>

        {/* Title/Bio */}
        {(profile.title || profile.bio || profile.user.bio) && (
          <p className="text-center text-sm opacity-80 mb-8 max-w-sm mx-auto">
            {profile.title || profile.bio || profile.user.bio}
          </p>
        )}

        {/* Social Links */}
        {profile.showSocials && profile.socialLinks.length > 0 && (
          <div className="flex justify-center gap-4 mb-8">
            {profile.socialLinks.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                title={social.platform}
              >
                {social.icon || getSocialIcon(social.platform)}
              </a>
            ))}
          </div>
        )}

        {/* Links */}
        <div className="space-y-3">
          {profile.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target={link.openInNewTab ? '_blank' : undefined}
              rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
              onClick={() => handleTrackClick(link)}
              className={cn(
                'w-full py-4 px-6 font-medium flex items-center justify-between transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                buttonStyles[profile.buttonStyle],
                profile.buttonStyle === 'OUTLINED' 
                  ? 'hover:bg-opacity-10' 
                  : 'hover:shadow-lg'
              )}
              style={{
                backgroundColor: profile.buttonStyle === 'OUTLINED' ? 'transparent' : btnColor,
                borderColor: profile.buttonStyle === 'OUTLINED' ? btnColor : undefined,
                color: profile.buttonStyle === 'OUTLINED' ? btnColor : '#ffffff',
              }}
            >
              <div className="flex items-center gap-3">
                {link.icon && <span className="text-xl">{link.icon}</span>}
                <span>{link.label}</span>
              </div>
              <ExternalLink className="w-4 h-4 opacity-50" />
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs opacity-40">
          {profile.metaDescription && (
            <p className="mb-2">{profile.metaDescription}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function getSocialIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: '𝕏',
    instagram: '📷',
    linkedin: '💼',
    youtube: '▶️',
    tiktok: '🎵',
    facebook: '📘',
    github: '💻',
    discord: '💬',
    twitch: '🎮',
    snapchat: '👻',
    pinterest: '📌',
    reddit: '🤖',
    medium: '✍️',
    telegram: '✈️',
    whatsapp: '💬',
  };
  return icons[platform.toLowerCase()] || '🔗';
}
