import bcrypt from 'bcrypt';
import 'dotenv/config';
import { db } from './db.js';

async function seed() {
  console.log('🌱 Starting database seeding...');

  const passwordHashAdmin = await bcrypt.hash('Admin123!', 10);
  const passwordHashEmployee = await bcrypt.hash('Employee123!', 10);

  // 1. Seed Super Admin
  const adminEmail = 'admin@acme.com';
  const existingAdmin = await db.orm.public.User.where({
    email: adminEmail,
  }).first();

  if (!existingAdmin) {
    const admin = await db.orm.public.User.create({
      email: adminEmail,
      name: 'System Administrator',
      password: passwordHashAdmin,
      role: 'ADMIN',
    });
    console.log(`✅ Admin user seeded: ${admin.email} (ID: ${admin.id})`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${existingAdmin.email}`);
  }

  // 2. Seed Default Employee
  const employeeEmail = 'employee@acme.com';
  const existingEmployee = await db.orm.public.User.where({
    email: employeeEmail,
  }).first();

  if (!existingEmployee) {
    const employee = await db.orm.public.User.create({
      email: employeeEmail,
      name: 'Default Employee',
      password: passwordHashEmployee,
      role: 'EMPLOYEE',
    });
    console.log(
      `✅ Employee user seeded: ${employee.email} (ID: ${employee.id})`,
    );
  } else {
    console.log(`ℹ️ Employee user already exists: ${existingEmployee.email}`);
  }

  console.log('🎉 Seeding completed successfully!');
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
