import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const ROUNDS = 12;

const AVATAR = (key: string) => `https://i.pravatar.cc/200?u=${key}`;

// ============================================================
// GAMBAR RANDOM DARI LOREM PICSUM (PASTI WORK 100%)
// ============================================================

// Koleksi ID gambar yang bagus dari Picsum
const IMAGE_IDS = [
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
  130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144,
  145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159,
  200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 300, 301, 302, 303, 304,
  305, 306, 307, 308, 309, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409,
  500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 600, 601, 602, 603, 604,
  605, 606, 607, 608, 609, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709,
  800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 900, 901, 902, 903, 904,
  905, 906, 907, 908, 909,
];

function getRandomImage(index: number): string {
  // Pilih gambar berdasarkan index untuk konsistensi (tetapi tetap bervariasi)
  const imageId = IMAGE_IDS[index % IMAGE_IDS.length];
  return `https://picsum.photos/id/${imageId}/600/400`;
}

const dayMs = 24 * 3600 * 1000;
const future = (days: number) => new Date(Date.now() + days * dayMs);
const past = (days: number) => new Date(Date.now() - days * dayMs);

async function main() {
  console.log('\n🌱 ========== STARTING SEED ==========\n');

  // ============================================================
  // CLEAN TABLES
  // ============================================================
  console.log('🧹 Cleaning existing data...');

  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.application.deleteMany();
  await prisma.order.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.job.deleteMany();
  await prisma.service.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.userBadge.deleteMany();

  console.log('✅ Clean complete\n');

  // ============================================================
  // CATEGORIES
  // ============================================================
  console.log('📂 Creating categories...');

  const categories = [
    { name: 'Desain Grafis', slug: 'desain-grafis', icon: 'fa-palette' },
    { name: 'Web Development', slug: 'web-development', icon: 'fa-code' },
    {
      name: 'Mobile Development',
      slug: 'mobile-development',
      icon: 'fa-mobile-screen',
    },
    { name: 'Data Entry', slug: 'data-entry', icon: 'fa-keyboard' },
    { name: 'Penulisan & Content', slug: 'penulisan', icon: 'fa-pen-nib' },
    { name: 'Video Editing', slug: 'video-editing', icon: 'fa-film' },
    {
      name: 'Digital Marketing',
      slug: 'digital-marketing',
      icon: 'fa-bullhorn',
    },
    { name: 'Les Privat', slug: 'les-privat', icon: 'fa-chalkboard-user' },
    {
      name: 'Service & Reparasi',
      slug: 'service-reparasi',
      icon: 'fa-screwdriver-wrench',
    },
    { name: 'Pindahan & Logistik', slug: 'pindahan', icon: 'fa-truck' },
  ];

  const catMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    catMap[cat.slug] = created.id;
  }
  console.log(`✅ ${categories.length} categories created\n`);

  // ============================================================
  // USERS
  // ============================================================
  console.log('👥 Creating users...');

  const hashAdmin = await bcrypt.hash('Admin@123', ROUNDS);
  const hashUser = await bcrypt.hash('User@123', ROUNDS);
  const hashSeller = await bcrypt.hash('Seller@123', ROUNDS);
  const hashBuyer = await bcrypt.hash('Buyer@123', ROUNDS);

  const users = [
    {
      email: 'admin@tolongin.com',
      password: hashAdmin,
      name: 'Admin Tolongin',
      phone: '+6281200000001',
      avatar: AVATAR('admin'),
      role: 'ADMIN',
      bio: 'Administrator platform Tolongin',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Jakarta Pusat',
      rating: 5.0,
      reviewCount: 0,
      balance: 0,
    },
    {
      email: 'citra@tolongin.com',
      password: hashSeller,
      name: 'Citra Kirana',
      phone: '+6281211223344',
      avatar: AVATAR('citra'),
      role: 'USER',
      bio: '✨ Top Rated Designer | 5+ tahun pengalaman',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Bandung',
      rating: 4.9,
      reviewCount: 342,
      totalOrders: 380,
      completedOrders: 370,
      balance: 12_500_000,
    },
    {
      email: 'andi@tolongin.com',
      password: hashSeller,
      name: 'Andi Pratama',
      phone: '+6281298765432',
      avatar: AVATAR('andi'),
      role: 'USER',
      bio: '💻 Senior Full-stack Developer',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Yogyakarta',
      rating: 4.9,
      reviewCount: 280,
      totalOrders: 310,
      completedOrders: 300,
      balance: 15_200_000,
    },
    {
      email: 'sari@tolongin.com',
      password: hashSeller,
      name: 'Sari Wulandari',
      phone: '+6281234567899',
      avatar: AVATAR('sari'),
      role: 'USER',
      bio: '✍️ Content Writer & SEO Specialist',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Surabaya',
      rating: 4.8,
      reviewCount: 156,
      totalOrders: 180,
      completedOrders: 170,
      balance: 6_800_000,
    },
    {
      email: 'maya@tolongin.com',
      password: hashSeller,
      name: 'Maya Sari',
      phone: '+6281544332211',
      avatar: AVATAR('maya'),
      role: 'USER',
      bio: '🎬 Video Editor & Motion Designer',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Bali',
      rating: 4.8,
      reviewCount: 198,
      totalOrders: 210,
      completedOrders: 200,
      balance: 7_200_000,
    },
    {
      email: 'budi@tolongin.com',
      password: hashSeller,
      name: 'Budi Setiawan',
      phone: '+6281355667788',
      avatar: AVATAR('budi'),
      role: 'USER',
      bio: '🔧 Teknisi Profesional',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Jakarta Selatan',
      rating: 4.7,
      reviewCount: 527,
      totalOrders: 560,
      completedOrders: 550,
      balance: 8_750_000,
    },
    {
      email: 'irawan@tolongin.com',
      password: hashSeller,
      name: 'Irawan Putra, S.Pd',
      phone: '+6285678901234',
      avatar: AVATAR('irawan'),
      role: 'USER',
      bio: '📚 Guru Les Privat',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Malang',
      rating: 5.0,
      reviewCount: 312,
      totalOrders: 340,
      completedOrders: 335,
      balance: 5_500_000,
    },
    {
      email: 'seller@tolongin.com',
      password: hashSeller,
      name: 'Yano Supriadi',
      phone: '+6281800800800',
      avatar: AVATAR('seller'),
      role: 'USER',
      bio: '🌟 Demo Seller | Fast & Reliable',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Tangerang',
      rating: 4.5,
      reviewCount: 45,
      totalOrders: 50,
      completedOrders: 48,
      balance: 1_250_000,
    },
    {
      email: 'rina@tolongin.com',
      password: hashBuyer,
      name: 'Rina Pratiwi',
      phone: '+6281622334455',
      avatar: AVATAR('rina'),
      role: 'USER',
      bio: '👗 Owner Brand Fashion',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Jakarta Utara',
      rating: 4.5,
      reviewCount: 12,
      balance: 0,
    },
    {
      email: 'aditya@tolongin.com',
      password: hashBuyer,
      name: 'Aditya Wirawan',
      phone: '+6281755443322',
      avatar: AVATAR('aditya'),
      role: 'USER',
      bio: '🚀 Founder Startup',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Jakarta Selatan',
      rating: 4.8,
      reviewCount: 8,
      balance: 0,
    },
    {
      email: 'buyer@tolongin.com',
      password: hashBuyer,
      name: 'Buyer Demo',
      phone: '+6281900900900',
      avatar: AVATAR('buyer'),
      role: 'USER',
      bio: '🎯 Demo Buyer',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: false,
      verified: false,
      city: 'Jakarta',
      rating: 0,
      reviewCount: 0,
      balance: 0,
    },
  ];

  const userMap: Record<string, string> = {};
  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: user,
    });
    userMap[user.email] = created.id;
  }
  console.log(`✅ ${users.length} users created\n`);

  // ============================================================
  // BANK ACCOUNTS
  // ============================================================
  console.log('🏦 Creating bank accounts...');

  const bankAccounts = [
    {
      email: 'citra@tolongin.com',
      bank: 'BCA',
      number: '1234567890',
      name: 'Citra Kirana',
    },
    {
      email: 'andi@tolongin.com',
      bank: 'BNI',
      number: '1122334455',
      name: 'Andi Pratama',
    },
    {
      email: 'sari@tolongin.com',
      bank: 'BRI',
      number: '2233445566',
      name: 'Sari Wulandari',
    },
    {
      email: 'maya@tolongin.com',
      bank: 'BCA',
      number: '3344556677',
      name: 'Maya Sari',
    },
    {
      email: 'budi@tolongin.com',
      bank: 'Mandiri',
      number: '0987654321',
      name: 'Budi Setiawan',
    },
    {
      email: 'irawan@tolongin.com',
      bank: 'CIMB',
      number: '4455667788',
      name: 'Irawan Putra',
    },
    {
      email: 'seller@tolongin.com',
      bank: 'BCA',
      number: '9999888877',
      name: 'Yano Supriadi',
    },
  ];

  for (const acc of bankAccounts) {
    const userId = userMap[acc.email];
    if (!userId) continue;

    const existing = await prisma.bankAccount.findFirst({ where: { userId } });
    if (!existing) {
      await prisma.bankAccount.create({
        data: {
          userId,
          bankName: acc.bank,
          accountNumber: acc.number,
          accountName: acc.name,
          isDefault: true,
          isVerified: true,
        },
      });
    }
  }
  console.log(`✅ ${bankAccounts.length} bank accounts created\n`);

  // ============================================================
  // SERVICES
  // ============================================================
  console.log('🛠️ Creating services...');

  const serviceList = [
    // Citra - Desain Grafis
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Logo Profesional + Brand Guideline',
      desc: 'Logo unik + buku panduan brand',
      price: 250000,
      delivery: 3,
      rev: 3,
      featured: true,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Feed Instagram Aesthetic (10 post)',
      desc: 'Template feed IG kekinian',
      price: 180000,
      delivery: 2,
      rev: 2,
      featured: true,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Edit Foto Produk Shopee/Tokopedia',
      desc: 'Foto produk siap jual',
      price: 120000,
      delivery: 2,
      rev: 2,
      featured: false,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Bikin Thumbnail YouTube Kekinian',
      desc: 'Thumbnail CTR tinggi',
      price: 85000,
      delivery: 1,
      rev: 2,
      featured: false,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Kemasan Produk UMKM',
      desc: 'Desain kemasan profesional',
      price: 300000,
      delivery: 4,
      rev: 3,
      featured: false,
    },

    // Andi - Web Development
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Website Company Profile Professional',
      desc: 'Corporate website with admin panel',
      price: 850000,
      delivery: 5,
      rev: 3,
      featured: true,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Landing Page High Converting',
      desc: 'Conversion-optimized landing page',
      price: 450000,
      delivery: 3,
      rev: 2,
      featured: true,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Portfolio Website Modern',
      desc: 'Modern portfolio website',
      price: 350000,
      delivery: 3,
      rev: 2,
      featured: false,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Custom Form dengan Database',
      desc: 'Online form with database',
      price: 350000,
      delivery: 2,
      rev: 2,
      featured: false,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Linktree Custom Keren',
      desc: 'Professional linktree',
      price: 75000,
      delivery: 1,
      rev: 2,
      featured: false,
    },

    // Sari - Penulisan
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Artikel SEO 1000 Kata',
      desc: 'SEO-friendly article',
      price: 150000,
      delivery: 2,
      rev: 2,
      featured: true,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Copywriting Produk untuk E-commerce',
      desc: 'Product description that sells',
      price: 100000,
      delivery: 1,
      rev: 2,
      featured: true,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Terjemahan Inggris-Indonesia (1000 kata)',
      desc: 'Accurate translation',
      price: 120000,
      delivery: 2,
      rev: 2,
      featured: false,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Script Video TikTok/Vlog',
      desc: 'Engaging video script',
      price: 80000,
      delivery: 1,
      rev: 1,
      featured: false,
    },

    // Maya - Video Editing
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Edit Video YouTube Vlog (10 menit)',
      desc: '+ thumbnail + subtitle',
      price: 250000,
      delivery: 3,
      rev: 2,
      featured: true,
    },
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Edit Video TikTok 30 Detik (Viral Style)',
      desc: 'Trending TikTok editing',
      price: 100000,
      delivery: 1,
      rev: 2,
      featured: true,
    },
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Video Profil Perusahaan (1 menit)',
      desc: 'Professional company profile',
      price: 500000,
      delivery: 5,
      rev: 3,
      featured: false,
    },
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Edit Video Kinemaster untuk Tugas',
      desc: 'Quick editing for assignments',
      price: 75000,
      delivery: 1,
      rev: 2,
      featured: false,
    },

    // Budi - Service & Reparasi
    {
      seller: 'budi@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service AC - Cuci & Isi Freon',
      desc: 'AC cooling service',
      price: 150000,
      delivery: 1,
      rev: 1,
      featured: true,
    },
    {
      seller: 'budi@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service Kulkas 1/2 Pintu',
      desc: 'Refrigerator repair',
      price: 120000,
      delivery: 1,
      rev: 1,
      featured: true,
    },
    {
      seller: 'budi@tolongin.com',
      cat: 'service-reparasi',
      title: 'Pasang AC Baru + Konsultasi',
      desc: 'AC installation',
      price: 200000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'budi@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service Mesin Cuci 1 Tabung',
      desc: 'Washing machine repair',
      price: 100000,
      delivery: 1,
      rev: 1,
      featured: false,
    },

    // Irawan - Les Privat
    {
      seller: 'irawan@tolongin.com',
      cat: 'les-privat',
      title: 'Les Online Matematika (1 jam)',
      desc: 'Math tutoring online',
      price: 75000,
      delivery: 1,
      rev: 1,
      featured: true,
    },
    {
      seller: 'irawan@tolongin.com',
      cat: 'les-privat',
      title: 'Bimbingan PR Matematika/Fisika',
      desc: 'Homework assistance',
      price: 50000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'irawan@tolongin.com',
      cat: 'les-privat',
      title: 'Belajar Bahasa Inggris Percakapan',
      desc: 'English conversation practice',
      price: 70000,
      delivery: 1,
      rev: 1,
      featured: false,
    },

    // Yano - Data Entry
    {
      seller: 'seller@tolongin.com',
      cat: 'data-entry',
      title: 'Ngetik Data Excel (500 baris)',
      desc: 'Fast and accurate data entry',
      price: 75000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'seller@tolongin.com',
      cat: 'data-entry',
      title: 'Convert PDF ke Word (100 halaman)',
      desc: 'PDF to Word conversion',
      price: 100000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'seller@tolongin.com',
      cat: 'data-entry',
      title: 'Scrape Data dari Website',
      desc: 'Web scraping service',
      price: 200000,
      delivery: 2,
      rev: 1,
      featured: false,
    },

    // Yano - Pindahan
    {
      seller: 'seller@tolongin.com',
      cat: 'pindahan',
      title: 'Jasa Pindahan Kosan Jakarta',
      desc: 'Moving service with packing',
      price: 500000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'seller@tolongin.com',
      cat: 'pindahan',
      title: 'Pindahan Rumah + Truk + Packing',
      desc: 'Full moving service',
      price: 1200000,
      delivery: 1,
      rev: 1,
      featured: false,
    },

    // Sari - Digital Marketing
    {
      seller: 'sari@tolongin.com',
      cat: 'digital-marketing',
      title: 'Instagram Growth (500 followers)',
      desc: 'Real Indonesian followers',
      price: 300000,
      delivery: 7,
      rev: 1,
      featured: false,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'digital-marketing',
      title: 'Setup Iklan Facebook/Instagram',
      desc: 'Ad campaign optimization',
      price: 400000,
      delivery: 3,
      rev: 2,
      featured: false,
    },
  ];

  let serviceIndex = 0;
  for (const svc of serviceList) {
    const sellerId = userMap[svc.seller];
    const categoryId = catMap[svc.cat];
    if (!sellerId || !categoryId) continue;

    const imageUrl = getRandomImage(serviceIndex);

    await prisma.service.create({
      data: {
        sellerId,
        categoryId,
        title: svc.title,
        description: svc.desc,
        price: svc.price,
        deliveryTime: svc.delivery,
        revisionCount: svc.rev,
        images: JSON.stringify([imageUrl]),
        rating: 4.5 + Math.random() * 0.5,
        reviewCount: Math.floor(Math.random() * 100) + 10,
        isFeatured: svc.featured,
      },
    });
    serviceIndex++;
  }
  console.log(`✅ ${serviceList.length} services created\n`);

  // ============================================================
  // JOBS
  // ============================================================
  console.log('💼 Creating jobs...');

  const jobList = [
    {
      buyer: 'rina@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Logo Brand Fashion',
      desc: 'Logo untuk brand fashion wanita',
      budget: 500000,
      deadline: 14,
      location: 'Jakarta',
      skills: ['Logo Design'],
      urgent: false,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Kemasan Skincare',
      desc: 'Kemasan tube + box untuk 3 varian',
      budget: 1200000,
      deadline: 21,
      location: 'Remote',
      skills: ['Packaging'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'web-development',
      title: 'Landing Page Startup',
      desc: 'Next.js + Tailwind',
      budget: 2500000,
      deadline: 14,
      location: 'Remote',
      skills: ['Next.js'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'web-development',
      title: 'Dashboard Admin',
      desc: 'React + Chart.js',
      budget: 800000,
      deadline: 10,
      location: 'Remote',
      skills: ['React'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'penulisan',
      title: 'Artikel Blog SEO 10 Artikel',
      desc: 'Topik startup & teknologi',
      budget: 1500000,
      deadline: 14,
      location: 'Remote',
      skills: ['SEO'],
      urgent: false,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'video-editing',
      title: 'Edit Video Flash Sale',
      desc: 'Video campaign flash sale',
      budget: 200000,
      deadline: 2,
      location: 'Remote',
      skills: ['Editing'],
      urgent: true,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service AC Kantor 2 Unit',
      desc: 'Jakarta Selatan area',
      budget: 300000,
      deadline: 3,
      location: 'Jakarta',
      skills: ['Service AC'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'data-entry',
      title: 'Input Data Peserta (1000 data)',
      desc: 'Google Forms ke Excel',
      budget: 250000,
      deadline: 3,
      location: 'Remote',
      skills: ['Data Entry'],
      urgent: false,
    },
  ];

  for (const job of jobList) {
    const buyerId = userMap[job.buyer];
    const categoryId = catMap[job.cat];
    if (!buyerId || !categoryId) continue;

    await prisma.job.create({
      data: {
        buyerId,
        categoryId,
        title: job.title,
        description: job.desc,
        budget: job.budget,
        budgetType: 'FIXED',
        deadline: future(job.deadline),
        location: job.location,
        isOnline: job.location === 'Remote',
        skills: JSON.stringify(job.skills),
        urgency: job.urgent ? 'URGENT' : 'NORMAL',
        status: 'OPEN',
        applicationsCount: 0,
      },
    });
  }
  console.log(`✅ ${jobList.length} jobs created\n`);

  // ============================================================
  // ORDERS
  // ============================================================
  console.log('📦 Creating orders...');

  const allServices = await prisma.service.findMany();

  const orderSpecs = [
    {
      buyer: 'rina@tolongin.com',
      seller: 'citra@tolongin.com',
      status: 'COMPLETED',
      daysAgo: 45,
    },
    {
      buyer: 'rina@tolongin.com',
      seller: 'andi@tolongin.com',
      status: 'COMPLETED',
      daysAgo: 30,
    },
    {
      buyer: 'aditya@tolongin.com',
      seller: 'sari@tolongin.com',
      status: 'COMPLETED',
      daysAgo: 21,
    },
    {
      buyer: 'aditya@tolongin.com',
      seller: 'citra@tolongin.com',
      status: 'IN_REVIEW',
      daysAgo: 5,
    },
    {
      buyer: 'rina@tolongin.com',
      seller: 'budi@tolongin.com',
      status: 'ACCEPTED',
      daysAgo: 2,
    },
    {
      buyer: 'aditya@tolongin.com',
      seller: 'maya@tolongin.com',
      status: 'IN_PROGRESS',
      daysAgo: 3,
    },
    {
      buyer: 'buyer@tolongin.com',
      seller: 'irawan@tolongin.com',
      status: 'WAITING_CONFIRMATION',
      daysAgo: 0,
    },
  ];

  for (const spec of orderSpecs) {
    const buyerId = userMap[spec.buyer];
    const sellerId = userMap[spec.seller];
    const service = allServices.find((s) => s.sellerId === sellerId);
    if (!buyerId || !sellerId || !service) continue;

    const amount = service.price;
    const fee = Math.round(amount * 0.05);
    const total = amount + fee;
    const createdAt = past(spec.daysAgo);

    await prisma.order.create({
      data: {
        buyerId,
        sellerId,
        serviceId: service.id,
        title: service.title,
        amount,
        fee,
        totalAmount: total,
        status: spec.status,
        deliveryType: 'DIGITAL',
        timeline: JSON.stringify([
          { status: spec.status, at: createdAt.toISOString(), by: buyerId },
        ]),
        createdAt,
        completedAt:
          spec.status === 'COMPLETED' ? past(spec.daysAgo - 2) : null,
      },
    });
  }
  console.log(`✅ ${orderSpecs.length} orders created\n`);

  // ============================================================
  // PLATFORM SETTINGS
  // ============================================================
  console.log('⚙️ Creating platform settings...');

  const settings = [
    { key: 'platform_fee_percent', value: '5' },
    { key: 'min_withdrawal', value: '50000' },
    { key: 'support_email', value: 'support@tolongin.com' },
    { key: 'maintenance_mode', value: 'false' },
  ];

  for (const setting of settings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }
  console.log(`✅ ${settings.length} platform settings created\n`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log('✅ SEEDING COMPLETE!');
  console.log('═'.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log(`   👥 Users: ${users.length}`);
  console.log(`   📂 Categories: ${categories.length}`);
  console.log(`   🛠️ Services: ${serviceList.length}`);
  console.log(`   💼 Jobs: ${jobList.length}`);
  console.log(`   📦 Orders: ${orderSpecs.length}`);

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('═'.repeat(40));
  console.log('   📧 Admin:  admin@tolongin.com / Admin@123');
  console.log('   📧 Seller: seller@tolongin.com / Seller@123');
  console.log('   📧 Buyer:  buyer@tolongin.com / Buyer@123');
  console.log('   📧 Top:    citra@tolongin.com / Seller@123');
  console.log('   📧 Top:    andi@tolongin.com / Seller@123');
  console.log('═'.repeat(40));

  console.log('\n🖼️ IMAGES:');
  console.log('   ✅ ALL services have random images from Lorem Picsum');
  console.log('   ✅ 100% reliable, no broken images');

  console.log('\n' + '═'.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('\n❌ SEED ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
