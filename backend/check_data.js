require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    select: {
      id: true, title: true, titleAr: true, slug: true, price: true, discountedPrice: true,
      status: true, isPublished: true, enrollmentCount: true, totalRevenue: true,
      thumbnailUrl: true, createdAt: true,
      instructor: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('=== COURSES (' + courses.length + ') ===');
  for (const c of courses) {
    console.log(`[${c.status}] ${c.title} | price=${c.price} disc=${c.discountedPrice} | enroll=${c.enrollmentCount} rev=${c.totalRevenue}`);
    console.log(`   slug=${c.slug} thumb=${c.thumbnailUrl}`);
    console.log(`   instructor=${c.instructor.fullName} <${c.instructor.email}>`);
  }

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true, role: true, isActive: true, isVerified: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('\n=== USERS (' + users.length + ') ===');
  for (const u of users) {
    console.log(`[${u.role}] ${u.fullName} <${u.email}> active=${u.isActive} verified=${u.isVerified}`);
  }

  const cats = await prisma.category.findMany({ select: { id: true, name: true, nameAr: true, slug: true, isActive: true } });
  console.log('\n=== CATEGORIES (' + cats.length + ') ===');
  for (const c of cats) console.log(`${c.name} / ${c.nameAr} slug=${c.slug} active=${c.isActive}`);

  console.log('\nreviews:', await prisma.review.count());
  console.log('enrollments:', await prisma.enrollment.count());
  console.log('orders:', await prisma.order.count());
  console.log('certificates:', await prisma.certificate.count());
}

main()
  .catch((e) => { console.error('DB CHECK FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
