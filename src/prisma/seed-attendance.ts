import 'dotenv/config';
import { db } from './db.js';

/**
 * Seeding script to populate realistic attendance records for an employee
 * from September 1st up to today (October 13th), skipping weekends (Saturday & Sunday).
 * Includes varied scenarios:
 * - On Time / Normal (PRESENT, checkIn 07:45 - 08:14, checkOut 17:00 - 17:30)
 * - Late arrival (LATE, checkIn 08:20 - 08:50 with notes & lateMinutes)
 * - Early checkout (PRESENT, checkOut 15:30 - 16:45 with earlyLeaveMinutes & notes)
 * - Both Late & Early checkout
 * - Absent (ABSENT without checkIn/checkOut)
 */
async function seedEmployeeAttendances() {
  console.log('🌱 Starting attendance history seeding...');

  const targetEmail = process.argv[2] || 'employee@acme.com';

  const user = await db.orm.public.User.where({
    email: targetEmail,
  }).first();

  if (!user) {
    console.error(`❌ User with email '${targetEmail}' not found!`);
    process.exit(1);
  }

  console.log(
    `👤 Target employee: ${user.name} (${user.email}, ID: ${user.id})`,
  );

  // Office base coordinates (Monas / Central Jakarta area)
  const baseLat = -6.175392;
  const baseLng = 106.827153;

  function randomCoords() {
    // Add small jitter ~50 - 200m
    const jitterLat = (Math.random() - 0.5) * 0.003;
    const jitterLng = (Math.random() - 0.5) * 0.003;
    return {
      lat: Number((baseLat + jitterLat).toFixed(6)),
      lng: Number((baseLng + jitterLng).toFixed(6)),
    };
  }

  // Range: 2026-09-01 until 2026-10-13 (today)
  const startDate = new Date(2026, 8, 1); // Month is 0-indexed: 8 = September
  const endDate = new Date(2026, 9, 13); // 9 = October

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedWeekendCount = 0;

  const cur = new Date(startDate);

  while (cur <= endDate) {
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      skippedWeekendCount++;
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Determine attendance pattern based on day index/random for diversity
    const dayNum = cur.getDate();
    const isToday = cur.getTime() === endDate.getTime();

    let status: 'PRESENT' | 'LATE' | 'ABSENT' = 'PRESENT';
    let checkIn: Date | null = null;
    let checkOut: Date | null = null;
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let notes: string | null = null;

    // Coordinate points
    const cinCoords = randomCoords();
    const coutCoords = randomCoords();

    if (dayNum % 11 === 0 && !isToday) {
      // Scenario: ABSENT (System automatic marking format)
      status = 'ABSENT';
      notes = 'System: Automatically marked as Absent';
    } else if (dayNum % 4 === 0) {
      // Scenario: LATE arrival
      status = 'LATE';
      const lateM = 20 + (dayNum % 25); // 20 - 45 mins late
      lateMinutes = lateM;

      const [inH, inM] = [8, 15 + (lateM - 15)]; // past 08:15 grace
      checkIn = new Date(cur);
      checkIn.setHours(inH, inM, Math.floor(Math.random() * 50), 0);

      // Normal checkout or slight overtime
      checkOut = new Date(cur);
      checkOut.setHours(
        17,
        10 + (dayNum % 30),
        Math.floor(Math.random() * 50),
        0,
      );

      notes = `Checkin: Heavy traffic on toll road (+${lateM}m delay)`;
    } else if (dayNum % 5 === 0 && !isToday) {
      // Scenario: EARLY LEAVE
      status = 'PRESENT';
      // On time check-in (07:50 - 08:05)
      checkIn = new Date(cur);
      checkIn.setHours(
        7,
        50 + (dayNum % 15),
        Math.floor(Math.random() * 50),
        0,
      );

      // Early checkout (e.g. 15:30 - 16:40) -> 20 - 90 minutes early
      const earlyM = 30 + (dayNum % 45);
      earlyLeaveMinutes = earlyM;

      const totalOutMin = 17 * 60 - earlyM;
      const outH = Math.floor(totalOutMin / 60);
      const outM = totalOutMin % 60;

      checkOut = new Date(cur);
      checkOut.setHours(outH, outM, Math.floor(Math.random() * 50), 0);

      notes = `Checkout: Medical appointment permission granted by supervisor (-${earlyM}m)`;
    } else if (dayNum % 7 === 0 && !isToday) {
      // Scenario: BOTH LATE & EARLY LEAVE
      status = 'LATE';
      const lateM = 25;
      lateMinutes = lateM;
      checkIn = new Date(cur);
      checkIn.setHours(8, 25, 12, 0);

      const earlyM = 45;
      earlyLeaveMinutes = earlyM;
      checkOut = new Date(cur);
      checkOut.setHours(16, 15, 30, 0);

      notes = `Checkin: Commuter line train signaling disruption | Checkout: Urgent family emergency (-45m)`;
    } else {
      // Scenario: REGULAR ON TIME
      status = 'PRESENT';
      // Arrived between 07:45 - 08:10 (within 15m grace)
      checkIn = new Date(cur);
      checkIn.setHours(
        7,
        45 + (dayNum % 25),
        Math.floor(Math.random() * 50),
        0,
      );

      if (!isToday) {
        // Departed between 17:05 - 17:45
        checkOut = new Date(cur);
        checkOut.setHours(
          17,
          5 + (dayNum % 40),
          Math.floor(Math.random() * 50),
          0,
        );
      }
    }

    const payload = {
      userId: user.id,
      date: dateStr,
      status,
      lateMinutes,
      earlyLeaveMinutes,
      notes,
      checkIn: checkIn ? checkIn.toISOString() : null,
      checkInLat: checkIn ? cinCoords.lat : null,
      checkInLng: checkIn ? cinCoords.lng : null,
      checkOut: checkOut ? checkOut.toISOString() : null,
      checkOutLat: checkOut ? coutCoords.lat : null,
      checkOutLng: checkOut ? coutCoords.lng : null,
    };

    const existing = await db.orm.public.Attendance.where({
      userId: user.id,
      date: dateStr,
    }).first();

    if (existing) {
      await db.orm.public.Attendance.where({
        id: existing.id,
      }).update(payload);
      updatedCount++;
    } else {
      await db.orm.public.Attendance.create(payload);
      insertedCount++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  console.log(`\n🎉 Attendance seeding finished!`);
  console.log(`   - Inserted: ${insertedCount} days`);
  console.log(`   - Updated: ${updatedCount} days`);
  console.log(`   - Weekends skipped: ${skippedWeekendCount} days`);
  console.log(
    `   - Total working days covered: ${insertedCount + updatedCount} days\n`,
  );

  process.exit(0);
}

seedEmployeeAttendances().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
