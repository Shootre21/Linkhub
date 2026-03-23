# LinkHub

<div align="center">

![LinkHub Logo](public/logo.svg)

**Your Links, Your Way**

A self-hosted, privacy-focused link management platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-green)](https://www.prisma.io/)

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [FAQ](#faq) • [Comparison](#comparison-with-competitors)

</div>

---

## Overview

LinkHub is a **100% self-hosted** alternative to popular link-in-bio services like Linktree and AllMyLinks. Built with modern technologies and designed for complete data sovereignty, LinkHub gives you full control over your links, analytics, and user data.

### Why LinkHub?

- **🔒 100% On-Premise**: Host on your own server. Your data never leaves your infrastructure.
- **🚫 Zero AI Dependencies**: No external AI services, no data sharing, complete privacy.
- **💰 No Monthly Fees**: Pay only for your own hosting. No subscription costs.
- **🎨 Full Customization**: Complete control over themes, colors, and styling.
- **📊 Built-in Analytics**: Track clicks and views without third-party trackers.
- **👥 Multi-User Support**: Create accounts for your entire team.

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Custom Profiles** | Each user gets a unique, customizable profile page |
| **Link Management** | Add, edit, reorder, and delete links with drag-and-drop simplicity |
| **Theme Customization** | Choose from preset themes or create your own with custom colors |
| **Analytics Dashboard** | Track page views, clicks, and visitor data |
| **Social Links** | Showcase your social media profiles prominently |
| **Public/Private Profiles** | Control visibility of your profile |

### Admin Features

| Feature | Description |
|---------|-------------|
| **User Management** | View and manage all registered users |
| **Site Settings** | Configure site name, domain, and branding |
| **Registration Control** | Enable/disable public registration |
| **Default User Settings** | Set default themes and limits for new users |
| **Analytics Overview** | Platform-wide statistics and metrics |
| **Domain Configuration** | Set custom domain for all profile URLs |

### Technical Features

- **Next.js 16** with App Router for optimal performance
- **TypeScript** for type safety
- **Prisma ORM** with SQLite (easily switchable to PostgreSQL/MySQL)
- **Tailwind CSS 4** for styling
- **shadcn/ui** components for a polished UI
- **Secure Authentication** with hashed passwords and session tokens

---

## Installation

### 🚀 One-Click Install (Windows)

The easiest way to get started on Windows is using our PowerShell installer:

```powershell
# Download and run the installer
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Shootre21/Linkhub/main/download/install.ps1" -OutFile "install.ps1"
.\install.ps1
```

#### Installer Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-Environment` | Target environment (dev/staging/prod) | dev |
| `-Port` | Application port | 3000 |
| `-DatabaseProvider` | Database type (sqlite/postgresql/mysql) | sqlite |
| `-SkipDocker` | Run without Docker | false |
| `-Rebuild` | Force rebuild containers | false |
| `-SkipSeed` | Skip database seeding | false |

```powershell
# Examples:
.\install.ps1 -Environment prod -Port 8080
.\install.ps1 -Rebuild -DatabaseProvider postgresql
.\install.ps1 -SkipDocker
```

The installer will:
- ✅ Validate system prerequisites (PowerShell, Node.js, Docker, Git)
- ✅ Install missing dependencies automatically
- ✅ Clone the repository
- ✅ Set up environment variables
- ✅ Build and start Docker containers (or run directly)
- ✅ Initialize and seed the database
- ✅ Verify everything is working

### Prerequisites

- Node.js 18.x or later
- npm, yarn, or bun package manager
- Git
- Docker (optional, for containerized deployment)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shootre21/Linkhub.git
   cd linkhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="file:./db/linkhub.db"
   NEXT_PUBLIC_SITE_URL="http://localhost:3000"
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access LinkHub**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

#### Using Docker (Recommended)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t linkhub .
docker run -p 3000:3000 linkhub
```

#### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

#### Deployment Platforms

LinkHub can be deployed on any platform that supports Node.js:

- **VPS/Cloud Servers**: DigitalOcean, Linode, AWS EC2, etc.
- **Vercel**: Zero-config deployment
- **Railway**: Simple deployment with database
- **Render**: Free tier available
- **Self-hosted**: Any server with Node.js

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./db/linkhub.db` |
| `NEXT_PUBLIC_SITE_URL` | Public URL of your LinkHub instance | `http://localhost:3000` |

### Admin Settings (via UI)

Configure these settings in the Admin Panel after logging in:

| Setting | Description | Default |
|---------|-------------|---------|
| `siteName` | Name displayed in headers and titles | LinkHub |
| `domain` | Custom domain for profile URLs | - |
| `allowRegistration` | Allow new user registration | true |
| `maxLinksPerUser` | Maximum links per user | 50 |
| `defaultPrimaryColor` | Default primary color for new users | #3b82f6 |
| `showPoweredBy` | Show "Powered by LinkHub" footer | true |

### Database Configuration

LinkHub uses Prisma ORM, supporting multiple databases:

#### SQLite (Default)
```env
DATABASE_URL="file:./db/linkhub.db"
```

#### PostgreSQL
```env
DATABASE_URL="postgresql://user:password@localhost:5432/linkhub"
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### MySQL
```env
DATABASE_URL="mysql://user:password@localhost:3306/linkhub"
```

---

## Usage Guide

### Creating Your Profile

1. Register an account or have an admin create one for you
2. Navigate to the Dashboard
3. Customize your profile settings:
   - Display name
   - Custom handle (your unique URL)
   - Title/bio
   - Theme colors

### Adding Links

1. In the Dashboard, go to "My Links"
2. Enter a label and URL for your link
3. Optionally add an emoji icon
4. Click "Add Link"
5. Reorder links using the arrow buttons
6. Toggle links on/off as needed

### Viewing Analytics

1. In the Dashboard, go to "Analytics"
2. View:
   - Total page views
   - Total link clicks
   - Unique visitors
   - Top performing links

### Admin Functions

1. Access the Admin Panel from the dashboard
2. Configure site-wide settings
3. View and manage users
4. Monitor platform analytics

---

## FAQ

### General Questions

**Q: Is LinkHub really free?**
A: Yes! LinkHub is open-source and free to use. You only pay for your own hosting.

**Q: Do I need any external services?**
A: No. LinkHub runs entirely on your server with no external dependencies.

**Q: Can I use my own domain?**
A: Yes. Configure your domain in the Admin Settings, and all profile URLs will use it.

**Q: How many links can I add?**
A: By default, 50 links per user. Admins can increase this limit in settings.

### Technical Questions

**Q: What database does LinkHub use?**
A: SQLite by default, but it supports PostgreSQL and MySQL via Prisma.

**Q: Can I import/export my data?**
A: The database can be backed up and migrated using standard SQLite/PostgreSQL tools.

**Q: Is there an API?**
A: LinkHub uses REST API endpoints for all operations. See the `/api` directory.

**Q: How are passwords stored?**
A: Passwords are hashed using scrypt with salt, providing strong security.

### Security Questions

**Q: Is LinkHub secure?**
A: LinkHub implements security best practices:
- Password hashing with scrypt
- Session-based authentication
- CSRF protection via Next.js
- No external data transmission

**Q: Can I disable registration?**
A: Yes. Admins can disable public registration in settings.

**Q: Where is my data stored?**
A: All data is stored in your database on your server. Nothing is sent externally.

---

## Comparison with Competitors

| Feature | LinkHub | Linktree | AllMyLinks | Carrd |
|---------|---------|----------|------------|-------|
| **Self-Hosted** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Open Source** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Unlimited Links** | ✅ Yes | ❌ Limited | ✅ Yes | ✅ Yes |
| **Full Analytics** | ✅ Yes | ❌ Paid | ❌ Limited | ❌ Paid |
| **Custom Themes** | ✅ Yes | ❌ Paid | ❌ Limited | ✅ Yes |
| **No Monthly Fee** | ✅ Yes | ❌ From $5/mo | ❌ Freemium | ❌ From $19/yr |
| **Data Privacy** | ✅ 100% | ❌ Third-party | ❌ Third-party | ❌ Third-party |
| **Custom Domain** | ✅ Yes | ✅ Paid | ✅ Paid | ✅ Paid |
| **Multi-User** | ✅ Yes | ❌ Single | ❌ Single | ❌ Single |
| **No AI Tracking** | ✅ Yes | ❌ Uses AI | ❌ Unknown | ❌ Unknown |
| **Full Customization** | ✅ Yes | ❌ Limited | ❌ Limited | ✅ Yes |

### Why Choose LinkHub Over Others?

1. **Complete Data Ownership**: Your data stays on your server, always.
2. **No Hidden Costs**: No subscription fees or premium tiers.
3. **Privacy First**: No tracking, no AI, no third-party services.
4. **Full Control**: Customize everything to match your brand.
5. **Team Ready**: Support multiple users on one installation.

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone and install
git clone https://github.com/Shootre21/Linkhub.git
cd linkhub
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

---

## License

LinkHub is released under the [MIT License](LICENSE).

---

## Support

- **Documentation**: [README.md](https://github.com/Shootre21/Linkhub#readme)
- **Issues**: [GitHub Issues](https://github.com/Shootre21/Linkhub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Shootre21/Linkhub/discussions)

---

<div align="center">

**Built with ❤️ for privacy-conscious creators and teams**

[Get Started](#installation) • [Report Bug](https://github.com/Shootre21/Linkhub/issues)

</div>
