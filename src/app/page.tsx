'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Link2, Lock, User, Mail, ArrowRight, Check, 
  Globe, Palette, BarChart3, Shield, Zap, Users,
  Github, Twitter, Linkedin, Instagram
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  profile?: {
    customHandle?: string;
  };
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      setUser(data.user);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          username: registerForm.username || undefined,
          firstName: registerForm.firstName || undefined,
          lastName: registerForm.lastName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setUser(data.user);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">LinkHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-slate-300 hover:text-white"
              onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Sign In
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-500"
              onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-6 bg-blue-500/10 text-blue-400 border-blue-500/20">
          100% Self-Hosted • No AI • Full Privacy
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Your Links, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Your Way</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Create beautiful link-in-bio pages with complete control. 
          Self-host on your own server with zero dependencies on third-party services.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-500 gap-2"
            onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Create Your Page <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
            View Demo
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: '100% On-Premise', desc: 'Host on your own infrastructure. Your data never leaves your server.' },
            { icon: Palette, title: 'Full Customization', desc: 'Customize colors, themes, and styles to match your brand perfectly.' },
            { icon: BarChart3, title: 'Built-in Analytics', desc: 'Track clicks, views, and visitor data without third-party trackers.' },
            { icon: Users, title: 'Multi-User Support', desc: 'Create accounts for team members with individual profile pages.' },
            { icon: Globe, title: 'Custom Domains', desc: 'Use your own domain for professional branding.' },
            { icon: Zap, title: 'Lightning Fast', desc: 'Optimized for performance with minimal load times.' },
          ].map((feature, i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-10">
          Why Choose LinkHub?
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-4 text-slate-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-blue-400 font-semibold">LinkHub</th>
                <th className="text-center py-4 px-4 text-slate-500">Linktree</th>
                <th className="text-center py-4 px-4 text-slate-500">AllMyLinks</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                ['Self-Hosted', true, false, false],
                ['Unlimited Links', true, false, true],
                ['Full Analytics', true, false, false],
                ['Custom Themes', true, false, false],
                ['No Monthly Fee', true, false, false],
                ['Data Privacy', true, false, false],
                ['Custom Domain', true, true, true],
                ['Open Source', true, false, false],
              ].map(([feature, linkhub, linktree, allmylinks], i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  <td className="py-4 px-4 text-slate-300">{feature}</td>
                  <td className="py-4 px-4 text-center">
                    {linkhub ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-slate-600">-</span>}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {linktree ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-slate-600">✗</span>}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {allmylinks ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <span className="text-slate-600">✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-section" className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto bg-slate-800/50 border-slate-700/50">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2 bg-slate-900/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-blue-600">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-blue-600">Register</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-white"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={submitting}>
                    {submitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">First Name</Label>
                      <Input
                        type="text"
                        placeholder="John"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Last Name</Label>
                      <Input
                        type="text"
                        placeholder="Doe"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="text"
                        placeholder="johndoe"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value.toLowerCase() })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="password"
                        placeholder="Min 8 characters"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-white"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-white"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={submitting}>
                    {submitting ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">LinkHub</span>
          </div>
          <p className="text-slate-500 text-sm">
            Open source link management platform. Self-host with complete control.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
