import { db } from '../src/lib/db';
import { hashPassword, generateUniqueHandle } from '../src/lib/auth';

async function main() {
  console.log('Seeding database...');

  // Check if admin exists
  const existingAdmin = await db.user.findUnique({
    where: { email: 'admin@linkhub.local' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }

  // Create admin user
  const hashedPassword = hashPassword('admin123');
  const handle = await generateUniqueHandle('admin');

  const admin = await db.user.create({
    data: {
      email: 'admin@linkhub.local',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      profile: {
        create: {
          displayName: 'Admin User',
          customHandle: handle,
          primaryColor: '#3b82f6',
        },
      },
    },
  });

  console.log('Created admin user:', admin.email);
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('⚠️  Please change the password after first login!');

  // Create default admin settings
  const settings = await db.adminSettings.create({
    data: {
      siteName: 'LinkHub',
      siteDescription: 'Your Links, Your Way',
      allowRegistration: true,
      maxLinksPerUser: 50,
    },
  });

  console.log('Created default settings');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
