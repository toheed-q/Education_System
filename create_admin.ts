import { db } from './server/db';
import { users } from './shared/schema';
import argon2 from 'argon2';

async function main() {
  const email = 'admin@lernentech.com';
  const password = 'adminpassword123';
  const hashedPassword = await argon2.hash(password);

  console.log(`Creating admin user: ${email}`);
  
  try {
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      name: 'System Admin',
      role: 'admin',
      isVerified: true
    }).returning();
    
    console.log(`Admin user created with ID: ${user.id}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (err: any) {
    if (err.code === '23505') {
      console.log('Admin user already exists.');
    } else {
      console.error('Error creating admin:', err);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
