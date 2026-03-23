'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Link2, Plus, Trash2, GripVertical, ExternalLink, Settings, 
  BarChart3, LogOut, Eye, EyeOff, Save, RefreshCw, Copy,
  Menu, X, ChevronUp, ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  profile?: {
    id: string;
    customHandle?: string;
    displayName?: string;
    title?: string;
    bio?: string;
    avatar?: string;
    theme: string;
    primaryColor: string;
    backgroundColor: string;
    buttonStyle: string;
    buttonColor: string;
    textColor: string;
    isPublic: boolean;
  };
}

interface Link {
  id: string;
  label: string;
  url: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  clickCount: number;
}

interface Analytics {
  totalPageViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  topLinks: { slug: string; count: number }[];
  dailyChart: { date: string; views: number; clicks: number }[];
  recentEvents: any[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<Link[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activeTab, setActiveTab] = useState('links');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Form states
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    customHandle: '',
    title: '',
    bio: '',
    primaryColor: '#3b82f6',
    backgroundColor: '#0f172a',
    buttonColor: '#3b82f6',
    textColor: '#ffffff',
    isPublic: true,
  });

  const [newLink, setNewLink] = useState({
    label: '',
    url: '',
    icon: '',
    description: '',
  });

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      
      if (data.user.profile) {
        setProfileForm({
          displayName: data.user.profile.displayName || '',
          customHandle: data.user.profile.customHandle || '',
          title: data.user.profile.title || '',
          bio: data.user.profile.bio || '',
          primaryColor: data.user.profile.primaryColor || '#3b82f6',
          backgroundColor: data.user.profile.backgroundColor || '#0f172a',
          buttonColor: data.user.profile.buttonColor || '#3b82f6',
          textColor: data.user.profile.textColor || '#ffffff',
          isPublic: data.user.profile.isPublic ?? true,
        });
      }
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/users/links');
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links);
      }
    } catch (error) {
      console.error('Failed to fetch links:', error);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/users/analytics?days=30');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetchLinks();
      fetchAnalytics();
    }
  }, [user, fetchLinks, fetchAnalytics]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      if (res.ok) {
        toast({ title: 'Profile saved!', description: 'Your changes have been saved.' });
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLink.label || !newLink.url) {
      toast({ title: 'Error', description: 'Label and URL are required', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/users/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink),
      });

      if (res.ok) {
        const data = await res.json();
        setLinks([...links, data.link]);
        setNewLink({ label: '', url: '', icon: '', description: '' });
        toast({ title: 'Link added!' });
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add link', variant: 'destructive' });
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const res = await fetch(`/api/users/links/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setLinks(links.filter((l) => l.id !== id));
        toast({ title: 'Link deleted' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete link', variant: 'destructive' });
    }
  };

  const handleToggleLink = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/users/links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (res.ok) {
        setLinks(links.map((l) => (l.id === id ? { ...l, isActive } : l)));
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update link', variant: 'destructive' });
    }
  };

  const moveLink = async (id: string, direction: 'up' | 'down') => {
    const index = links.findIndex((l) => l.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === links.length - 1)
    ) {
      return;
    }

    const newLinks = [...links];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];

    // Update order values
    const updates = newLinks.map((l, i) => ({ id: l.id, order: i }));
    setLinks(newLinks);

    try {
      await fetch('/api/users/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: updates }),
      });
    } catch (error) {
      console.error('Failed to reorder links:', error);
    }
  };

  const copyProfileUrl = () => {
    if (user?.profile?.customHandle) {
      navigator.clipboard.writeText(`${window.location.origin}/${user.profile.customHandle}`);
      toast({ title: 'URL copied!' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">LinkHub</h1>
              <p className="text-sm text-slate-400">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.profile?.customHandle && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300"
                onClick={copyProfileUrl}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Profile
              </Button>
            )}
            {user.role === 'ADMIN' && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300"
                onClick={() => router.push('/admin')}
              >
                Admin Panel
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">
                      {(user.firstName || user.username)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-semibold text-white">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.username}
                  </h2>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>

                <nav className="space-y-2">
                  <Button
                    variant={activeTab === 'links' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === 'links' ? 'bg-blue-600' : 'text-slate-300'}`}
                    onClick={() => setActiveTab('links')}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    My Links
                  </Button>
                  <Button
                    variant={activeTab === 'profile' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === 'profile' ? 'bg-blue-600' : 'text-slate-300'}`}
                    onClick={() => setActiveTab('profile')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Button>
                  <Button
                    variant={activeTab === 'analytics' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === 'analytics' ? 'bg-blue-600' : 'text-slate-300'}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </nav>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-slate-800/50 border-slate-700/50 mt-4">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Links</span>
                    <span className="font-semibold text-white">{links.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Clicks</span>
                    <span className="font-semibold text-white">{analytics?.totalClicks || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Page Views</span>
                    <span className="font-semibold text-white">{analytics?.totalPageViews || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'links' && (
              <div className="space-y-6">
                {/* Add New Link */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Add New Link</CardTitle>
                    <CardDescription className="text-slate-400">
                      Add a new link to your profile page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-slate-300">Label *</Label>
                        <Input
                          placeholder="My Website"
                          className="bg-slate-900/50 border-slate-700 text-white mt-1"
                          value={newLink.label}
                          onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-slate-300">URL *</Label>
                        <Input
                          placeholder="https://example.com"
                          className="bg-slate-900/50 border-slate-700 text-white mt-1"
                          value={newLink.url}
                          onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Icon (emoji)</Label>
                        <Input
                          placeholder="🔗"
                          className="bg-slate-900/50 border-slate-700 text-white mt-1"
                          value={newLink.icon}
                          onChange={(e) => setNewLink({ ...newLink, icon: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-4 bg-blue-600 hover:bg-blue-500"
                      onClick={handleAddLink}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Link
                    </Button>
                  </CardContent>
                </Card>

                {/* Links List */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Your Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {links.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        No links yet. Add your first link above!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {links.map((link, index) => (
                          <div
                            key={link.id}
                            className={`flex items-center gap-3 p-4 rounded-lg border ${
                              link.isActive
                                ? 'bg-slate-900/50 border-slate-700'
                                : 'bg-slate-900/20 border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500 hover:text-white"
                                onClick={() => moveLink(link.id, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500 hover:text-white"
                                onClick={() => moveLink(link.id, 'down')}
                                disabled={index === links.length - 1}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <span className="text-xl w-8 text-center">
                              {link.icon || '🔗'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{link.label}</p>
                              <p className="text-sm text-slate-400 truncate">{link.url}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-white">{link.clickCount}</p>
                              <p className="text-xs text-slate-500">clicks</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={link.isActive}
                                onCheckedChange={(checked) => handleToggleLink(link.id, checked)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'profile' && (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Profile Settings</CardTitle>
                  <CardDescription className="text-slate-400">
                    Customize your public profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-slate-300">Display Name</Label>
                      <Input
                        className="bg-slate-900/50 border-slate-700 text-white mt-1"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Custom Handle</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                        <Input
                          className="pl-8 bg-slate-900/50 border-slate-700 text-white"
                          value={profileForm.customHandle}
                          onChange={(e) => setProfileForm({ ...profileForm, customHandle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Title</Label>
                    <Input
                      className="bg-slate-900/50 border-slate-700 text-white mt-1"
                      placeholder="Content Creator | Developer"
                      value={profileForm.title}
                      onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Bio</Label>
                    <Input
                      className="bg-slate-900/50 border-slate-700 text-white mt-1"
                      placeholder="Tell your visitors a bit about yourself"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  <h3 className="font-semibold text-white">Theme Colors</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-slate-300 text-sm">Primary Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-slate-900 border-slate-700"
                          value={profileForm.primaryColor}
                          onChange={(e) => setProfileForm({ ...profileForm, primaryColor: e.target.value })}
                        />
                        <Input
                          className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                          value={profileForm.primaryColor}
                          onChange={(e) => setProfileForm({ ...profileForm, primaryColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm">Background</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-slate-900 border-slate-700"
                          value={profileForm.backgroundColor}
                          onChange={(e) => setProfileForm({ ...profileForm, backgroundColor: e.target.value })}
                        />
                        <Input
                          className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                          value={profileForm.backgroundColor}
                          onChange={(e) => setProfileForm({ ...profileForm, backgroundColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm">Button Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-slate-900 border-slate-700"
                          value={profileForm.buttonColor}
                          onChange={(e) => setProfileForm({ ...profileForm, buttonColor: e.target.value })}
                        />
                        <Input
                          className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                          value={profileForm.buttonColor}
                          onChange={(e) => setProfileForm({ ...profileForm, buttonColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm">Text Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 bg-slate-900 border-slate-700"
                          value={profileForm.textColor}
                          onChange={(e) => setProfileForm({ ...profileForm, textColor: e.target.value })}
                        />
                        <Input
                          className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                          value={profileForm.textColor}
                          onChange={(e) => setProfileForm({ ...profileForm, textColor: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Public Profile</Label>
                      <p className="text-sm text-slate-500">Make your profile visible to everyone</p>
                    </div>
                    <Switch
                      checked={profileForm.isPublic}
                      onCheckedChange={(checked) => setProfileForm({ ...profileForm, isPublic: checked })}
                    />
                  </div>

                  <Button
                    className="bg-blue-600 hover:bg-blue-500"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-400 mb-1">Total Page Views</p>
                      <p className="text-3xl font-bold text-white">{analytics?.totalPageViews || 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-400 mb-1">Total Clicks</p>
                      <p className="text-3xl font-bold text-white">{analytics?.totalClicks || 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-400 mb-1">Unique Visitors</p>
                      <p className="text-3xl font-bold text-white">{analytics?.uniqueVisitors || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Links */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Top Performing Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.topLinks && analytics.topLinks.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.topLinks.map((link, i) => {
                          const fullLink = links.find((l) => l.id === link.slug);
                          return (
                            <div key={i} className="flex items-center gap-4">
                              <span className="text-slate-500 w-6">{i + 1}.</span>
                              <span className="text-xl w-8">{fullLink?.icon || '🔗'}</span>
                              <span className="flex-1 text-white">{fullLink?.label || link.slug}</span>
                              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                                {link.count} clicks
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-4">No link clicks yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
