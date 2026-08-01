import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  // Delete all data in dependency order
  await p.examResult.deleteMany({});
  await p.examOption.deleteMany({});
  await p.examQuestion.deleteMany({});
  await p.exam.deleteMany({});
  await p.assignmentSubmission.deleteMany({});
  await p.assignment.deleteMany({});
  await p.courseResource.deleteMany({});
  await p.courseMedia.deleteMany({});
  await p.courseLecture.deleteMany({});
  await p.courseSection.deleteMany({});
  await p.courseApproval.deleteMany({});
  await p.certificate.deleteMany({});
  await p.enrollment.deleteMany({});
  await p.orderItem.deleteMany({});
  await p.order.deleteMany({});
  await p.review.deleteMany({});
  await p.payment.deleteMany({});
  await p.commission.deleteMany({});
  await p.course.deleteMany({});
  await p.loginHistory.deleteMany({});
  await p.session.deleteMany({});
  await p.otpVerification.deleteMany({});
  await p.notification.deleteMany({});
  await p.supportTicket.deleteMany({});
  await p.auditLog.deleteMany({});
  await p.announcement.deleteMany({});
  await p.platformSettings.deleteMany({});
  await p.studentProfile.deleteMany({});
  await p.instructorProfile.deleteMany({});
  await p.category.deleteMany({});
  await p.user.deleteMany({});

  // Create fresh users
  const adminPwd = await bcrypt.hash('Kjmnkjmn98@', 12);
  await p.user.create({
    data: { fullName: 'مدير المنصة', email: 'almisriualqaysar@gmail.com', passwordHash: adminPwd, role: 'ADMIN', isVerified: true },
  });

  const instPwd = await bcrypt.hash('Inst@123456', 12);
  const inst = await p.user.create({
    data: {
      fullName: 'أحمد محمد',
      email: 'instructor@nuvexa.com',
      passwordHash: instPwd,
      role: 'INSTRUCTOR',
      isVerified: true,
      instructorProfile: { create: { headline: 'مطور ويب ومصمم جرافيك', isVerified: true } },
    },
  });

  const studPwd = await bcrypt.hash('Stud@123456', 12);
  await p.user.create({
    data: { fullName: 'سارة أحمد', email: 'student@nuvexa.com', passwordHash: studPwd, role: 'STUDENT', isVerified: true, studentProfile: { create: {} } },
  });

  // Create categories
  const cats = [
    { name: 'تطوير الويب', nameAr: 'تطوير الويب', slug: 'web-development', icon: '🌐' },
    { name: 'تطوير التطبيقات', nameAr: 'تطوير التطبيقات', slug: 'mobile-development', icon: '📱' },
    { name: 'علم البيانات', nameAr: 'علم البيانات', slug: 'data-science', icon: '📊' },
    { name: 'DevOps', nameAr: 'ديف أوبس', slug: 'devops', icon: '⚙️' },
    { name: 'التصميم', nameAr: 'التصميم', slug: 'design', icon: '🎨' },
    { name: 'إدارة الأعمال', nameAr: 'إدارة الأعمال', slug: 'business', icon: '💼' },
    { name: 'تقنية المعلومات', nameAr: 'تقنية المعلومات', slug: 'it-software', icon: '🖥️' },
    { name: 'التسويق', nameAr: 'التسويق', slug: 'marketing', icon: '📈' },
    { name: 'أخرى', nameAr: 'أخرى', slug: 'other', icon: '➕' },
  ];
  for (const cat of cats) {
    await p.category.create({ data: { ...cat, isActive: true, order: 0 } });
  }

  // One sample course so the platform isn't empty
  await p.course.create({
    data: {
      title: 'تطوير واجهات الويب باستخدام React',
      titleAr: 'تطوير واجهات الويب باستخدام React',
      slug: 'react-web-development-' + Date.now().toString(36),
      shortDescription: 'تعلم بناء تطبيقات ويب احترافية باستخدام React',
      shortDescriptionAr: 'تعلم بناء تطبيقات ويب احترافية باستخدام React',
      description: 'دورة شاملة لتعلم React من الصفر حتى الاحتراف',
      descriptionAr: 'دورة شاملة لتعلم React من الصفر حتى الاحتراف',
      price: 299,
      level: 'BEGINNER',
      instructorId: inst.id,
      categoryId: (await p.category.findFirst({ where: { slug: 'web-development' } }))!.id,
      status: 'APPROVED',
      isPublished: true,
      totalLectures: 12,
      allowCertificate: true,
    },
  });

  console.log('Database reset complete!');
  console.log('Admin: almisriualqaysar@gmail.com / Kjmnkjmn98@');
  console.log('Instructor: instructor@nuvexa.com / Inst@123456');
  console.log('Student: student@nuvexa.com / Stud@123456');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
