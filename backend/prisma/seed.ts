import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (pwd: string) => bcrypt.hash(pwd, 12);

  const adminPwd = await hash('Kjmnkjmn98@');
  await prisma.user.upsert({
    where: { email: 'almisriualqaysar@gmail.com' },
    update: { passwordHash: adminPwd, isActive: true, isVerified: true },
    create: {
      fullName: 'مدير المنصة',
      email: 'almisriualqaysar@gmail.com',
      passwordHash: adminPwd,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  const instPwd = await hash('Inst@123456');
  await prisma.user.upsert({
    where: { email: 'instructor@nuvexa.com' },
    update: { passwordHash: instPwd, isActive: true, isVerified: true },
    create: {
      fullName: 'أحمد محمد',
      email: 'instructor@nuvexa.com',
      passwordHash: instPwd,
      role: 'INSTRUCTOR',
      isActive: true,
      isVerified: true,
      instructorProfile: { create: { headline: 'مطور ويب ومصمم جرافيك', isVerified: true } },
    },
  });

  const studPwd = await hash('Stud@123456');
  await prisma.user.upsert({
    where: { email: 'student@nuvexa.com' },
    update: { passwordHash: studPwd, isActive: true, isVerified: true },
    create: {
      fullName: 'سارة أحمد',
      email: 'student@nuvexa.com',
      passwordHash: studPwd,
      role: 'STUDENT',
      isActive: true,
      isVerified: true,
      studentProfile: { create: {} },
    },
  });

  await prisma.category.upsert({
    where: { slug: 'other' },
    update: { name: 'أخرى', nameAr: 'أخرى', isActive: true },
    create: { name: 'أخرى', nameAr: 'أخرى', slug: 'other', icon: '➕', isActive: true, order: 999 },
  });

  console.log('Seed completed successfully');
  console.log('Admin: almisriualqaysar@gmail.com / Kjmnkjmn98@');
  console.log('Instructor: instructor@nuvexa.com / Inst@123456');
  console.log('Student: student@nuvexa.com / Stud@123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
