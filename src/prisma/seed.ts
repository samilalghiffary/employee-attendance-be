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

  // 3. Seed Default SystemSetting (Work Schedule)
  const defaultScheduleKey = 'DEFAULT_SCHEDULE';
  const existingSetting = await db.orm.public.SystemSetting.where({
    key: defaultScheduleKey,
  }).first();

  if (!existingSetting) {
    const setting = await db.orm.public.SystemSetting.create({
      key: defaultScheduleKey,
      workStartTime: '08:00',
      workEndTime: '17:00',
      lateToleranceMinutes: 15,
    });
    console.log(
      `✅ Default Work Schedule seeded: ${setting.workStartTime} - ${setting.workEndTime} (Grace: ${setting.lateToleranceMinutes}m)`,
    );
  } else {
    const setting = await db.orm.public.SystemSetting.where({
      key: defaultScheduleKey,
    }).update({
      workStartTime: '08:00',
      workEndTime: '17:00',
      lateToleranceMinutes: 15,
    });
    console.log(
      `✅ Work Schedule setting reset to default: ${setting?.workStartTime} - ${setting?.workEndTime} (Grace: ${setting?.lateToleranceMinutes}m)`,
    );
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
