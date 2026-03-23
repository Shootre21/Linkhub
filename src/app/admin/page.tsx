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
import { 
  Settings, Users, BarChart3, ArrowLeft, Save, RefreshCw,
  Globe, Shield, Mail, Palette, Link2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminSettings {
  id: string;
  siteName: string;
  siteDescription?: string;
  domain?: string;
  allowRegistration: boolean;
  requireEmailVerify: boolean;
  defaultTheme: string;
  defaultPrimaryColor: string;
  defaultButtonStyle: string;
  maxLinksPerUser: number;
  trackIPs: boolean;
  retentionDays: number;
  footerText?: string;
  showPoweredBy: boolean;
}

interface AdminAnalytics {
  totalUsers: number;
  totalLinks: number;
  totalPageViews: number;
  totalClicks: number;
}

interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  createdAt: string;
  profile?: {
    customHandle?: string;
    displayName?: string;
  };
  _count?: {
    links: number;
  };
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/');
        return;
      }
      const data = await res.json();
      if (data.user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setIsAdmin(true);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?limit=50');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchAnalytics();
      fetchUsers();
    }
  }, [isAdmin, fetchSettings, fetchAnalytics, fetchUsers]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({ title: 'Settings saved!', description: 'Your changes have been applied.' });
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400">Manage your LinkHub instance</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300"
            onClick={() => {
              fetchSettings();
              fetchAnalytics();
              fetchUsers();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.totalUsers || 0}</p>
                  <p className="text-sm text-slate-400">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.totalLinks || 0}</p>
                  <p className="text-sm text-slate-400">Total Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.totalPageViews || 0}</p>
                  <p className="text-sm text-slate-400">Page Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.totalClicks || 0}</p>
                  <p className="text-sm text-slate-400">Link Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800/50 border-slate-700/50 mb-6">
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            {settings && (
              <div className="space-y-6">
                {/* General Settings */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure your LinkHub instance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-slate-300">Site Name</Label>
                        <Input
                          className="bg-slate-900/50 border-slate-700 text-white mt-1"
                          value={settings.siteName}
                          onChange={(e) => updateSetting('siteName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Domain</Label>
                        <Input
                          className="bg-slate-900/50 border-slate-700 text-white mt-1"
                          placeholder="links.yourcompany.com"
                          value={settings.domain || ''}
                          onChange={(e) => updateSetting('domain', e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Set your custom domain for profile URLs
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300">Site Description</Label>
                      <Input
                        className="bg-slate-900/50 border-slate-700 text-white mt-1"
                        placeholder="Your link-in-bio platform"
                        value={settings.siteDescription || ''}
                        onChange={(e) => updateSetting('siteDescription', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Registration Settings */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Registration & Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Allow Registration</Label>
                        <p className="text-sm text-slate-500">Allow new users to create accounts</p>
                      </div>
                      <Switch
                        checked={settings.allowRegistration}
                        onCheckedChange={(checked) => updateSetting('allowRegistration', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Track IP Addresses</Label>
                        <p className="text-sm text-slate-500">Store visitor IP addresses in analytics</p>
                      </div>
                      <Switch
                        checked={settings.trackIPs}
                        onCheckedChange={(checked) => updateSetting('trackIPs', checked)}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Analytics Retention (days)</Label>
                      <Input
                        type="number"
                        className="bg-slate-900/50 border-slate-700 text-white mt-1 w-32"
                        value={settings.retentionDays}
                        onChange={(e) => updateSetting('retentionDays', parseInt(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Default User Settings */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Default User Settings
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      These settings apply to new users by default
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-slate-300">Max Links Per User</Label>
                        <Input
                          type="number"
                          className="bg-slate-900/50 border-slate-700 text-white mt-1 w-32"
                          value={settings.maxLinksPerUser}
                          onChange={(e) => updateSetting('maxLinksPerUser', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Default Primary Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            className="w-12 h-10 p-1 bg-slate-900 border-slate-700"
                            value={settings.defaultPrimaryColor}
                            onChange={(e) => updateSetting('defaultPrimaryColor', e.target.value)}
                          />
                          <Input
                            className="flex-1 bg-slate-900/50 border-slate-700 text-white"
                            value={settings.defaultPrimaryColor}
                            onChange={(e) => updateSetting('defaultPrimaryColor', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Show "Powered by LinkHub"</Label>
                        <p className="text-sm text-slate-500">Display attribution in footer</p>
                      </div>
                      <Switch
                        checked={settings.showPoweredBy}
                        onCheckedChange={(checked) => updateSetting('showPoweredBy', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-500"
                    onClick={handleSaveSettings}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save All Settings'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription className="text-slate-400">
                  View and manage all registered users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">User</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Email</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Handle</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Links</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Role</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {(user.firstName || user.username)?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {user.firstName && user.lastName
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.username}
                                </p>
                                <p className="text-xs text-slate-500">@{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-sm">{user.email}</td>
                          <td className="py-3 px-4 text-slate-300 text-sm">
                            {user.profile?.customHandle || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-sm">
                            {user._count?.links || 0}
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                              className={user.role === 'ADMIN' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-300'}
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant="secondary"
                              className={user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                            >
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      No users found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
