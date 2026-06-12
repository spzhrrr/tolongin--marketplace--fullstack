import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const ROUNDS = 12;

const AVATAR = (key: string) => `https://i.pravatar.cc/200?u=${key}`;

// ============================================================
// GAMBAR VALID DARI PEXELS & UNSPLASH (HIGH QUALITY)
// ============================================================

const IMAGES = {
  // Desain Grafis
  LOGO_DESIGN:
    'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=600',
  GRAPHIC_DESIGN:
    'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=600',
  ILLUSTRATION:
    'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=600',
  BRAND_IDENTITY:
    'https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=600',
  SOCIAL_MEDIA:
    'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Web Development
  WEB_DEV_1:
    'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=600',
  WEB_DEV_2:
    'https://images.pexels.com/photos/177598/pexels-photo-177598.jpeg?auto=compress&cs=tinysrgb&w=600',
  WEB_DEV_3:
    'https://images.pexels.com/photos/276452/pexels-photo-276452.jpeg?auto=compress&cs=tinysrgb&w=600',
  WEB_DEV_4:
    'https://images.pexels.com/photos/160107/pexels-photo-160107.jpeg?auto=compress&cs=tinysrgb&w=600',
  WEB_DEV_5:
    'https://images.pexels.com/photos/574077/pexels-photo-574077.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Mobile Development
  MOBILE_DEV_1:
    'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=600',
  MOBILE_DEV_2:
    'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg?auto=compress&cs=tinysrgb&w=600',
  MOBILE_DEV_3:
    'https://images.pexels.com/photos/799443/pexels-photo-799443.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Data Entry
  DATA_ENTRY_1:
    'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg?auto=compress&cs=tinysrgb&w=600',
  DATA_ENTRY_2:
    'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=600',
  DATA_ENTRY_3:
    'https://images.pexels.com/photos/2187175/pexels-photo-2187175.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Penulisan
  WRITING_1:
    'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=600',
  WRITING_2:
    'https://images.pexels.com/photos/1451448/pexels-photo-1451448.jpeg?auto=compress&cs=tinysrgb&w=600',
  COPYWRITING:
    'https://images.pexels.com/photos/5632380/pexels-photo-5632380.jpeg?auto=compress&cs=tinysrgb&w=600',
  SEO_WRITING:
    'https://images.pexels.com/photos/346797/pexels-photo-346797.jpeg?auto=compress&cs=tinysrgb&w=600',
  BLOG: 'https://images.pexels.com/photos/4057663/pexels-photo-4057663.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Video Editing
  VIDEO_EDIT_1:
    'https://images.pexels.com/photos/2958865/pexels-photo-2958865.jpeg?auto=compress&cs=tinysrgb&w=600',
  VIDEO_EDIT_2:
    'https://images.pexels.com/photos/257904/pexels-photo-257904.jpeg?auto=compress&cs=tinysrgb&w=600',
  THUMBNAIL:
    'https://images.pexels.com/photos/5081973/pexels-photo-5081973.jpeg?auto=compress&cs=tinysrgb&w=600',
  VIDEO_PROD:
    'https://images.pexels.com/photos/2267463/pexels-photo-2267463.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Digital Marketing
  DIGITAL_MARKETING_1:
    'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=600',
  DIGITAL_MARKETING_2:
    'https://images.pexels.com/photos/2881215/pexels-photo-2881215.jpeg?auto=compress&cs=tinysrgb&w=600',
  SOCIAL_MEDIA_MARKETING:
    'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=600',
  SEO: 'https://images.pexels.com/photos/346797/pexels-photo-346797.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Les Privat
  TEACHING_1:
    'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=600',
  TEACHING_2:
    'https://images.pexels.com/photos/374788/pexels-photo-374788.jpeg?auto=compress&cs=tinysrgb&w=600',
  TUTORING:
    'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=600',
  ONLINE_CLASS:
    'https://images.pexels.com/photos/4145197/pexels-photo-4145197.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Service & Reparasi
  AC_REPAIR:
    'https://images.pexels.com/photos/2582874/pexels-photo-2582874.jpeg?auto=compress&cs=tinysrgb&w=600',
  FRIDGE_REPAIR:
    'https://images.pexels.com/photos/1378720/pexels-photo-1378720.jpeg?auto=compress&cs=tinysrgb&w=600',
  ELECTRICIAN:
    'https://images.pexels.com/photos/6526/refrigerator-kitchen-fridge-appliance.jpg?auto=compress&cs=tinysrgb&w=600',
  REPAIR:
    'https://images.pexels.com/photos/221025/pexels-photo-221025.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Pindahan
  MOVING_1:
    'https://images.pexels.com/photos/1345386/pexels-photo-1345386.jpeg?auto=compress&cs=tinysrgb&w=600',
  MOVING_2:
    'https://images.pexels.com/photos/15694/pexels-photo-15694.jpeg?auto=compress&cs=tinysrgb&w=600',
  MOVING_3:
    'https://images.pexels.com/photos/618079/pexels-photo-618079.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Tambahan untuk seller Yano & Irawan
  DATA_EXCEL:
    'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=600',
  PDF_CONVERT:
    'https://images.pexels.com/photos/2187175/pexels-photo-2187175.jpeg?auto=compress&cs=tinysrgb&w=600',
  WEB_SCRAPE:
    'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg?auto=compress&cs=tinysrgb&w=600',
  MATH_TUTOR:
    'https://images.pexels.com/photos/4145197/pexels-photo-4145197.jpeg?auto=compress&cs=tinysrgb&w=600',
  ENGLISH_TUTOR:
    'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=600',

  // Default (always valid)
  DEFAULT:
    'https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=600',
};

function getServiceImage(
  categorySlug: string,
  title: string,
  index: number,
): string {
  const titleLower = title.toLowerCase();

  // Keyword-based image selection (diperluas untuk mencakup semua service)
  const keywordMap: Record<string, string> = {
    // Desain
    logo: IMAGES.LOGO_DESIGN,
    'desain logo': IMAGES.LOGO_DESIGN,
    'brand identity': IMAGES.BRAND_IDENTITY,
    desain: IMAGES.GRAPHIC_DESIGN,
    ilustrasi: IMAGES.ILLUSTRATION,
    'feed instagram': IMAGES.SOCIAL_MEDIA,
    kemasan: IMAGES.BRAND_IDENTITY,

    // Web
    website: IMAGES.WEB_DEV_1,
    landing: IMAGES.WEB_DEV_2,
    portfolio: IMAGES.WEB_DEV_3,
    'company profile': IMAGES.WEB_DEV_4,

    // Mobile
    mobile: IMAGES.MOBILE_DEV_1,
    aplikasi: IMAGES.MOBILE_DEV_2,

    // Data Entry (untuk Yano)
    data: IMAGES.DATA_ENTRY_1,
    excel: IMAGES.DATA_EXCEL,
    'ngetik data': IMAGES.DATA_EXCEL,
    convert: IMAGES.PDF_CONVERT,
    pdf: IMAGES.PDF_CONVERT,
    scrape: IMAGES.WEB_SCRAPE,
    'web scraping': IMAGES.WEB_SCRAPE,

    // Penulisan
    tulis: IMAGES.WRITING_1,
    artikel: IMAGES.WRITING_2,
    copywriting: IMAGES.COPYWRITING,
    seo: IMAGES.SEO_WRITING,
    blog: IMAGES.BLOG,
    terjemahan: IMAGES.WRITING_2,

    // Video
    video: IMAGES.VIDEO_EDIT_1,
    edit: IMAGES.VIDEO_EDIT_2,
    thumbnail: IMAGES.THUMBNAIL,
    'video profil': IMAGES.VIDEO_PROD,

    // Digital Marketing
    'digital marketing': IMAGES.DIGITAL_MARKETING_2,
    'google ads': IMAGES.DIGITAL_MARKETING_1,
    iklan: IMAGES.DIGITAL_MARKETING_1,
    followers: IMAGES.SOCIAL_MEDIA_MARKETING,

    // Les Privat (untuk Irawan)
    les: IMAGES.TEACHING_1,
    privat: IMAGES.TEACHING_2,
    bimbingan: IMAGES.TUTORING,
    online: IMAGES.ONLINE_CLASS,
    matematika: IMAGES.MATH_TUTOR,
    fisika: IMAGES.MATH_TUTOR,
    'bahasa inggris': IMAGES.ENGLISH_TUTOR,

    // Service
    ac: IMAGES.AC_REPAIR,
    service: IMAGES.AC_REPAIR,
    kulkas: IMAGES.FRIDGE_REPAIR,
    'mesin cuci': IMAGES.REPAIR,
    'pasang ac': IMAGES.AC_REPAIR,

    // Pindahan
    pindahan: IMAGES.MOVING_1,
    moving: IMAGES.MOVING_2,
  };

  for (const [keyword, image] of Object.entries(keywordMap)) {
    if (titleLower.includes(keyword)) {
      return image;
    }
  }

  // Fallback by category
  const categoryMap: Record<string, string> = {
    'desain-grafis': IMAGES.GRAPHIC_DESIGN,
    'web-development': IMAGES.WEB_DEV_1,
    'mobile-development': IMAGES.MOBILE_DEV_1,
    'data-entry': IMAGES.DATA_ENTRY_1,
    penulisan: IMAGES.WRITING_1,
    'video-editing': IMAGES.VIDEO_EDIT_1,
    'digital-marketing': IMAGES.DIGITAL_MARKETING_1,
    'les-privat': IMAGES.TEACHING_1,
    'service-reparasi': IMAGES.AC_REPAIR,
    pindahan: IMAGES.MOVING_1,
  };

  // Cycle through images based on index jika banyak jasa
  const cycleImages = [
    IMAGES.WEB_DEV_1,
    IMAGES.WEB_DEV_2,
    IMAGES.WEB_DEV_3,
    IMAGES.WEB_DEV_4,
    IMAGES.WEB_DEV_5,
  ];
  if (categorySlug === 'web-development') {
    return cycleImages[index % cycleImages.length];
  }

  return categoryMap[categorySlug] || IMAGES.DEFAULT;
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
  // USERS (with realistic data)
  // ============================================================
  console.log('👥 Creating users...');

  const hashAdmin = await bcrypt.hash('Admin@123', ROUNDS);
  const hashUser = await bcrypt.hash('User@123', ROUNDS);
  const hashSeller = await bcrypt.hash('Seller@123', ROUNDS);
  const hashBuyer = await bcrypt.hash('Buyer@123', ROUNDS);

  const users = [
    // Admin
    {
      email: 'admin@tolongin.com',
      password: hashAdmin,
      name: 'Admin Tolongin',
      phone: '+6281200000001',
      avatar: AVATAR('admin'),
      role: 'ADMIN',
      bio: 'Administrator platform Tolongin, siap membantu Anda 24/7!',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Jakarta Pusat',
      rating: 5.0,
      reviewCount: 0,
      balance: 0,
    },
    // Top Sellers
    {
      email: 'citra@tolongin.com',
      password: hashSeller,
      name: 'Citra Kirana',
      phone: '+6281211223344',
      avatar: AVATAR('citra'),
      role: 'USER',
      bio: '🏆 Top Rated Designer | 5+ tahun pengalaman | 1000+ project selesai',
      skills: JSON.stringify(['Logo Design', 'Brand Identity', 'Illustration']),
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
      email: 'budi.teknik@tolongin.com',
      password: hashSeller,
      name: 'Budi Setiawan',
      phone: '+6281355667788',
      avatar: AVATAR('budi'),
      role: 'USER',
      bio: '🔧 Teknisi profesional bersertifikat | Service AC, Kulkas, Mesin Cuci',
      skills: JSON.stringify([
        'Service AC',
        'Service Kulkas',
        'Service Mesin Cuci',
      ]),
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Jakarta Selatan',
      rating: 4.8,
      reviewCount: 527,
      totalOrders: 580,
      completedOrders: 560,
      balance: 8_750_000,
    },
    {
      email: 'andi@tolongin.com',
      password: hashSeller,
      name: 'Andi Pratama',
      phone: '+6281298765432',
      avatar: AVATAR('andi'),
      role: 'USER',
      bio: '💻 Full-stack developer | React, Node.js, Laravel | 4+ tahun',
      skills: JSON.stringify(['React', 'Node.js', 'Laravel', 'Next.js']),
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Yogyakarta',
      rating: 4.8,
      reviewCount: 156,
      totalOrders: 180,
      completedOrders: 170,
      balance: 15_200_000,
    },
    {
      email: 'sari@tolongin.com',
      password: hashSeller,
      name: 'Sari Wulandari',
      phone: '+6281234567899',
      avatar: AVATAR('sari'),
      role: 'USER',
      bio: '✍️ Content writer & SEO specialist | Ghostwriter for CEOs',
      skills: JSON.stringify(['Copywriting', 'SEO', 'Blog Writing']),
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Surabaya',
      rating: 4.9,
      reviewCount: 284,
      totalOrders: 310,
      completedOrders: 300,
      balance: 6_800_000,
    },
    {
      email: 'maya@tolongin.com',
      password: hashSeller,
      name: 'Maya Sari',
      phone: '+6281544332211',
      avatar: AVATAR('maya'),
      role: 'USER',
      bio: '🎬 Video editor & motion designer | 3+ tahun di industri kreatif',
      skills: JSON.stringify(['Premiere Pro', 'After Effects', 'CapCut']),
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Bali',
      rating: 4.7,
      reviewCount: 98,
      totalOrders: 110,
      completedOrders: 105,
      balance: 4_200_000,
    },
    {
      email: 'irawan@tolongin.com',
      password: hashSeller,
      name: 'Irawan Putra, S.Pd',
      phone: '+6285678901234',
      avatar: AVATAR('irawan'),
      role: 'USER',
      bio: '📚 Guru les privat | Matematika, Fisika, Bahasa Inggris',
      skills: JSON.stringify(['Matematika', 'Fisika', 'Bahasa Inggris']),
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
    // Buyers
    {
      email: 'rina@tolongin.com',
      password: hashBuyer,
      name: 'Rina Pratiwi',
      phone: '+6281622334455',
      avatar: AVATAR('rina'),
      role: 'USER',
      bio: '👗 Owner brand fashion "Rina Modiste" | Selalu butuh desain keren!',
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
      bio: '🚀 Founder startup EdTech | Sering butuh developer dan designer',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: true,
      verified: true,
      city: 'Jakarta Selatan',
      rating: 4.8,
      reviewCount: 8,
      balance: 0,
    },
    // Demo accounts
    {
      email: 'seller@tolongin.com',
      password: hashSeller,
      name: 'Yano Supriadi',
      phone: '+6281800800800',
      avatar: AVATAR('seller'),
      role: 'USER',
      bio: '🌟 Demo Seller | Coba berbagai fitur Tolongin',
      skills: JSON.stringify(['Data Entry', 'Virtual Assistant']),
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
      email: 'buyer@tolongin.com',
      password: hashBuyer,
      name: 'Buyer Demo',
      phone: '+6281900900900',
      avatar: AVATAR('buyer'),
      role: 'USER',
      bio: '🎯 Demo Buyer | Cari freelancer untuk berbagai project',
      emailVerified: true,
      phoneVerified: true,
      ktpVerified: false,
      verified: false,
      city: 'Jakarta',
      rating: 0,
      reviewCount: 0,
      balance: 0,
    },
    // New user (unverified)
    {
      email: 'newbie@tolongin.com',
      password: hashUser,
      name: 'Budi Santoso',
      phone: '+6281211112222',
      avatar: AVATAR('newbie'),
      role: 'USER',
      bio: 'Baru daftar, masih explore fitur Tolongin',
      emailVerified: false,
      phoneVerified: false,
      ktpVerified: false,
      verified: false,
      city: 'Depok',
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
    console.log(`  ✅ ${user.name} (${user.email})`);
  }
  console.log(`✅ ${users.length} users created\n`);

  // ============================================================
  // BANK ACCOUNTS (for sellers)
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
      email: 'budi.teknik@tolongin.com',
      bank: 'Mandiri',
      number: '0987654321',
      name: 'Budi Setiawan',
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
      console.log(`  ✅ ${acc.name} - ${acc.bank} ${acc.number}`);
    }
  }
  console.log(`✅ ${bankAccounts.length} bank accounts created\n`);

  // ============================================================
  // SERVICES (dengan gambar yang selalu valid)
  // ============================================================
  console.log('🛠️ Creating services...');

  const serviceList = [
    // Desain Grafis (Citra)
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Logo Profesional + Brand Guideline',
      desc: 'Logo unik + buku panduan brand (warna, font, penggunaan)',
      price: 250000,
      delivery: 3,
      rev: 3,
      featured: true,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Feed Instagram Aesthetic (10 post)',
      desc: 'Template feed IG yang kekinian dan konsisten',
      price: 180000,
      delivery: 2,
      rev: 2,
      featured: true,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Edit Foto Produk Shopee/Tokopedia (20 foto)',
      desc: 'Hasil foto premium, siap jual!',
      price: 120000,
      delivery: 2,
      rev: 2,
      featured: false,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Bikin Thumbnail YouTube Kekinian',
      desc: 'Thumbnail ala creator besar, CTR tinggi!',
      price: 85000,
      delivery: 1,
      rev: 2,
      featured: false,
    },
    {
      seller: 'citra@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Kemasan Produk (Box, Sticker, Label)',
      desc: 'Kemasan menarik untuk produk UMKM',
      price: 300000,
      delivery: 4,
      rev: 3,
      featured: false,
    },

    // Web Development (Andi)
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Portfolio Website Modern (React + Tailwind)',
      desc: 'Website portfolio yang responsive dan modern',
      price: 750000,
      delivery: 5,
      rev: 3,
      featured: true,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Landing Page untuk Startup/Produk',
      desc: 'Landing page conversion-optimized',
      price: 500000,
      delivery: 3,
      rev: 3,
      featured: true,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Website Company Profile (Laravel)',
      desc: 'Company profile dengan admin panel',
      price: 1_500_000,
      delivery: 7,
      rev: 3,
      featured: false,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Custom Form dengan Database',
      desc: 'Form online + export ke excel',
      price: 350000,
      delivery: 2,
      rev: 2,
      featured: false,
    },
    {
      seller: 'andi@tolongin.com',
      cat: 'web-development',
      title: 'Linktree Custom Keren',
      desc: 'Linktree ala profesional',
      price: 75000,
      delivery: 1,
      rev: 2,
      featured: false,
    },

    // Penulisan (Sari)
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Artikel SEO 1000 Kata',
      desc: 'Artikel yang ranking di Google!',
      price: 150000,
      delivery: 2,
      rev: 2,
      featured: true,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Copywriting Produk untuk E-commerce',
      desc: 'Deskripsi produk yang bikin auto checkout',
      price: 100000,
      delivery: 1,
      rev: 2,
      featured: true,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Jasa Terjemahan Inggris-Indonesia (1000 kata)',
      desc: 'Terjemahan akurat dan natural',
      price: 120000,
      delivery: 2,
      rev: 2,
      featured: false,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'penulisan',
      title: 'Script Video TikTok/Vlog',
      desc: 'Script engaging untuk konten viral',
      price: 80000,
      delivery: 1,
      rev: 1,
      featured: false,
    },

    // Video Editing (Maya)
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Edit Video TikTok 30 Detik (Viral Style)',
      desc: 'Edit ala content creator gede!',
      price: 100000,
      delivery: 1,
      rev: 2,
      featured: true,
    },
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Edit Video YouTube Vlog/Podcast',
      desc: 'Rapih + thumbnail + subtitle',
      price: 250000,
      delivery: 3,
      rev: 2,
      featured: true,
    },
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Video Profil Perusahaan (1 menit)',
      desc: 'Video company profile profesional',
      price: 1_000_000,
      delivery: 5,
      rev: 3,
      featured: false,
    },
    {
      seller: 'maya@tolongin.com',
      cat: 'video-editing',
      title: 'Edit Video Kinemaster untuk Tugas',
      desc: 'Tinggal kasih materi, saya yang edit',
      price: 75000,
      delivery: 1,
      rev: 2,
      featured: false,
    },

    // Service & Reparasi (Budi)
    {
      seller: 'budi.teknik@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service AC - Cuci & Isi Freon',
      desc: 'AC dingin lagi! Garansi 1 bulan',
      price: 150000,
      delivery: 1,
      rev: 1,
      featured: true,
    },
    {
      seller: 'budi.teknik@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service Kulkas 1/2 Pintu',
      desc: 'Kulkas dingin sebelah? Dibenerin!',
      price: 120000,
      delivery: 1,
      rev: 1,
      featured: true,
    },
    {
      seller: 'budi.teknik@tolongin.com',
      cat: 'service-reparasi',
      title: 'Pasang AC Baru + Konsultasi',
      desc: 'Pemasangan AC profesional',
      price: 200000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'budi.teknik@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service Mesin Cuci 1 Tabung',
      desc: 'Mesin cuci rusak? Langsung dibenerin',
      price: 100000,
      delivery: 1,
      rev: 1,
      featured: false,
    },

    // Les Privat (Irawan)
    {
      seller: 'irawan@tolongin.com',
      cat: 'les-privat',
      title: 'Les Online Matematika (1 jam)',
      desc: 'Belajar santai, dijamin paham!',
      price: 75000,
      delivery: 1,
      rev: 1,
      featured: true,
    },
    {
      seller: 'irawan@tolongin.com',
      cat: 'les-privat',
      title: 'Bimbingan PR Matematika/Fisika',
      desc: 'Cocok buat anak SD/SMP/SMA',
      price: 50000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'irawan@tolongin.com',
      cat: 'les-privat',
      title: 'Belajar Bahasa Inggris Pemula',
      desc: 'Cara asik biar cepet bisa ngomong!',
      price: 70000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'irawan@tolongin.com',
      cat: 'les-privat',
      title: 'Persiapan Ujian Sekolah (Matematika)',
      desc: 'Bimbingan intensif 5x pertemuan',
      price: 350000,
      delivery: 5,
      rev: 1,
      featured: false,
    },

    // Digital Marketing (Sari)
    {
      seller: 'sari@tolongin.com',
      cat: 'digital-marketing',
      title: 'Naikin Followers IG Organik (500)',
      desc: 'Followers real Indonesia, aman!',
      price: 300000,
      delivery: 7,
      rev: 1,
      featured: false,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'digital-marketing',
      title: 'Setup Iklan Instagram/Facebook',
      desc: 'Optimasi iklan untuk ROI maksimal',
      price: 400000,
      delivery: 3,
      rev: 2,
      featured: false,
    },
    {
      seller: 'sari@tolongin.com',
      cat: 'digital-marketing',
      title: 'SEO On-Page untuk Website',
      desc: 'Website ranking di halaman 1 Google',
      price: 500000,
      delivery: 5,
      rev: 2,
      featured: false,
    },

    // Data Entry (Seller Demo - Yano) - DIPERBAIKI
    {
      seller: 'seller@tolongin.com',
      cat: 'data-entry',
      title: 'Ngetik Data Excel 500 Baris',
      desc: 'Tinggal kirim, saya kerjain rapi!',
      price: 75000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'seller@tolongin.com',
      cat: 'data-entry',
      title: 'Convert PDF ke Word/Excel (100 halaman)',
      desc: 'Gak perlu ngetik ulang!',
      price: 100000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'seller@tolongin.com',
      cat: 'data-entry',
      title: 'Scrape Data dari Website',
      desc: 'Ambil data dari website manapun',
      price: 200000,
      delivery: 2,
      rev: 1,
      featured: false,
    },

    // Pindahan (Seller Demo - Yano)
    {
      seller: 'seller@tolongin.com',
      cat: 'pindahan',
      title: 'Jasa Pindahan Kosan (Jakarta area)',
      desc: '+ packing, tinggal santai!',
      price: 500000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
    {
      seller: 'seller@tolongin.com',
      cat: 'pindahan',
      title: 'Pindahan Rumah + Truk + Packing',
      desc: 'Tim profesional, barang aman',
      price: 1_200_000,
      delivery: 1,
      rev: 1,
      featured: false,
    },
  ];

  let serviceIndex = 0;
  for (const svc of serviceList) {
    const sellerId = userMap[svc.seller];
    const categoryId = catMap[svc.cat];
    if (!sellerId || !categoryId) continue;

    const imageUrl = getServiceImage(svc.cat, svc.title, serviceIndex);
    console.log(
      `  📸 ${svc.title.substring(0, 40)}... -> ${imageUrl.substring(0, 80)}...`,
    );

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
        rating: 4.8,
        reviewCount: Math.floor(Math.random() * 100) + 10,
        isFeatured: svc.featured,
      },
    });
    serviceIndex++;
  }
  console.log(`✅ ${serviceList.length} services created\n`);

  // ============================================================
  // JOBS (20+ realistic jobs)
  // ============================================================
  console.log('💼 Creating jobs...');

  const jobList = [
    // Design jobs
    {
      buyer: 'rina@tolongin.com',
      cat: 'desain-grafis',
      title: 'Bikin Logo Brand Fashion "Rina Modiste"',
      desc: 'Logo elegan untuk brand fashion wanita',
      budget: 500000,
      deadline: 14,
      location: 'Jakarta',
      skills: ['Logo Design'],
      urgent: false,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'desain-grafis',
      title: 'Desain Kemasan Skincare Series',
      desc: 'Kemasan tube + box untuk 3 varian',
      budget: 1_200_000,
      deadline: 21,
      location: 'Remote',
      skills: ['Packaging Design'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'desain-grafis',
      title: '[URGENT] Banner Event 2 Hari Lagi',
      desc: 'Ukuran 5x2 meter untuk acara kampus',
      budget: 250000,
      deadline: 2,
      location: 'Jakarta',
      skills: ['Banner Design'],
      urgent: true,
    },

    // Web dev jobs
    {
      buyer: 'aditya@tolongin.com',
      cat: 'web-development',
      title: 'Landing Page Startup Edukasi',
      desc: 'Next.js + Tailwind, modern dan cepat',
      budget: 2_500_000,
      deadline: 14,
      location: 'Remote',
      skills: ['Next.js', 'Tailwind'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'web-development',
      title: 'Dashboard Admin untuk Aplikasi',
      desc: 'React + Chart.js, tampilkan data realtime',
      budget: 3_000_000,
      deadline: 21,
      location: 'Remote',
      skills: ['React', 'Chart.js'],
      urgent: false,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'web-development',
      title: 'Website Portofolio untuk Fotografer',
      desc: 'Tampilkan gallery foto dengan baik',
      budget: 1_800_000,
      deadline: 14,
      location: 'Remote',
      skills: ['Gallery', 'Responsive'],
      urgent: false,
    },

    // Content writing jobs
    {
      buyer: 'aditya@tolongin.com',
      cat: 'penulisan',
      title: 'Artikel Blog SEO 10 Artikel',
      desc: 'Topik startup & teknologi',
      budget: 1_500_000,
      deadline: 21,
      location: 'Remote',
      skills: ['SEO', 'Blog Writing'],
      urgent: false,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'penulisan',
      title: 'Copywriting untuk Website Brand',
      desc: 'Copywriting untuk homepage + about + product',
      budget: 800_000,
      deadline: 7,
      location: 'Remote',
      skills: ['Copywriting'],
      urgent: false,
    },

    // Video editing jobs
    {
      buyer: 'aditya@tolongin.com',
      cat: 'video-editing',
      title: 'Edit 5 Video TikTok Promo Produk',
      desc: 'Durasi 30 detik per video',
      budget: 500_000,
      deadline: 7,
      location: 'Remote',
      skills: ['TikTok Editing'],
      urgent: false,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'video-editing',
      title: '[URGENT] Edit Video Flash Sale 24 Jam',
      desc: 'Video untuk campaign flash sale',
      budget: 300_000,
      deadline: 1,
      location: 'Remote',
      skills: ['Fast Editing'],
      urgent: true,
    },

    // Service jobs
    {
      buyer: 'rina@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service AC Kantor 2 Unit',
      desc: 'Jakarta Selatan area',
      budget: 300_000,
      deadline: 3,
      location: 'Jakarta Selatan',
      skills: ['Service AC'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'service-reparasi',
      title: 'Service Kulkas + Cuci AC Rumah',
      desc: 'Rumah di BSD Tangerang',
      budget: 400_000,
      deadline: 3,
      location: 'Tangerang',
      skills: ['Service AC', 'Service Kulkas'],
      urgent: false,
    },

    // Tutoring jobs
    {
      buyer: 'rina@tolongin.com',
      cat: 'les-privat',
      title: 'Guru Les Matematika untuk Anak SD',
      desc: '2x seminggu, Sabtu & Minggu',
      budget: 600_000,
      deadline: 30,
      location: 'Jakarta Timur',
      skills: ['Matematika SD'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'les-privat',
      title: 'Tutor Bahasa Inggris Online',
      desc: 'Untuk karyawan, malam hari',
      budget: 500_000,
      deadline: 30,
      location: 'Remote',
      skills: ['Bahasa Inggris'],
      urgent: false,
    },

    // Digital marketing jobs
    {
      buyer: 'rina@tolongin.com',
      cat: 'digital-marketing',
      title: 'Konten Instagram 1 Bulan (30 post)',
      desc: 'Untuk brand fashion',
      budget: 1_500_000,
      deadline: 30,
      location: 'Remote',
      skills: ['Instagram'],
      urgent: false,
    },
    {
      buyer: 'aditya@tolongin.com',
      cat: 'digital-marketing',
      title: 'Setup dan Optimasi Google Ads',
      desc: 'Untuk campaign produk digital',
      budget: 1_000_000,
      deadline: 7,
      location: 'Remote',
      skills: ['Google Ads'],
      urgent: false,
    },

    // Data entry jobs
    {
      buyer: 'aditya@tolongin.com',
      cat: 'data-entry',
      title: 'Input Data Peserta Event (1000 data)',
      desc: 'Google Forms ke Excel',
      budget: 250_000,
      deadline: 3,
      location: 'Remote',
      skills: ['Data Entry'],
      urgent: false,
    },
    {
      buyer: 'rina@tolongin.com',
      cat: 'data-entry',
      title: 'Scrape Data Competitor Product',
      desc: 'Ambil data dari e-commerce',
      budget: 400_000,
      deadline: 5,
      location: 'Remote',
      skills: ['Web Scraping'],
      urgent: false,
    },

    // Moving jobs
    {
      buyer: 'rina@tolongin.com',
      cat: 'pindahan',
      title: 'Pindahan Apartemen ke Rumah Baru',
      desc: 'Jakarta Pusat ke BSD, 2 kamar',
      budget: 1_200_000,
      deadline: 7,
      location: 'Jakarta-Tangerang',
      skills: ['Moving'],
      urgent: false,
    },

    // Closed job
    {
      buyer: 'aditya@tolongin.com',
      cat: 'web-development',
      title: '[CLOSED] Redesign Website Perusahaan',
      desc: 'Job sudah ditutup',
      budget: 5_000_000,
      deadline: -10,
      location: 'Remote',
      skills: ['Web Design'],
      urgent: false,
      status: 'CLOSED',
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
        deadline:
          job.deadline >= 0
            ? future(job.deadline)
            : past(Math.abs(job.deadline)),
        location: job.location,
        isOnline: job.location === 'Remote',
        skills: JSON.stringify(job.skills),
        urgency: job.urgent ? 'URGENT' : 'NORMAL',
        status: job.status || 'OPEN',
        applicationsCount: 0,
      },
    });
  }
  console.log(`✅ ${jobList.length} jobs created\n`);

  // ============================================================
  // ORDERS (completed & in-progress)
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
      seller: 'budi.teknik@tolongin.com',
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
    {
      buyer: 'rina@tolongin.com',
      seller: 'seller@tolongin.com',
      status: 'COMPLETED',
      daysAgo: 60,
    },
    {
      buyer: 'aditya@tolongin.com',
      seller: 'seller@tolongin.com',
      status: 'CANCELLED',
      daysAgo: 10,
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
        cancelledAt:
          spec.status === 'CANCELLED' ? past(spec.daysAgo - 1) : null,
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
    { key: 'bidding_min_percent', value: '0.5' },
    { key: 'bidding_max_percent', value: '1.5' },
    { key: 'support_email', value: 'support@tolongin.com' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'max_delivery_days', value: '30' },
    { key: 'auto_complete_days', value: '7' },
    { key: 'auto_cancel_days', value: '14' },
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
  // SAMPLE CHAT CONVERSATION
  // ============================================================
  console.log('💬 Creating sample conversation...');

  const andiId = userMap['andi@tolongin.com'];
  const sariId = userMap['sari@tolongin.com'];

  if (andiId && sariId) {
    const conversation = await prisma.conversation.create({
      data: {
        participants: JSON.stringify([andiId, sariId]),
        lastMessage: 'Terima kasih, projectnya selesai tepat waktu!',
        lastMessageAt: past(1),
      },
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: andiId,
          content: 'Halo Sari, saya tertarik dengan jasa artikel SEO Anda.',
          createdAt: past(3),
        },
        {
          conversationId: conversation.id,
          senderId: sariId,
          content: 'Halo Andi! Terima kasih minatnya. Bisa kirimkan briefnya?',
          createdAt: past(3),
        },
        {
          conversationId: conversation.id,
          senderId: andiId,
          content: 'Baik, saya akan kirimkan detailnya melalui email.',
          createdAt: past(2),
        },
        {
          conversationId: conversation.id,
          senderId: sariId,
          content: 'Oke, saya tunggu ya. Estimasi pengerjaan 3 hari.',
          createdAt: past(2),
        },
        {
          conversationId: conversation.id,
          senderId: andiId,
          content: 'Terima kasih, projectnya selesai tepat waktu!',
          createdAt: past(1),
        },
      ],
    });
    console.log('✅ Sample conversation created');
  }

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
  console.log(`   ⚙️ Settings: ${settings.length}`);

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('═'.repeat(40));
  console.log('   📧 Admin:      admin@tolongin.com / Admin@123');
  console.log('   📧 Seller:     seller@tolongin.com / Seller@123');
  console.log('   📧 Buyer:      buyer@tolongin.com / Buyer@123');
  console.log('   📧 Top Seller: citra@tolongin.com / Seller@123');
  console.log('   📧 Top Seller: budi.teknik@tolongin.com / Seller@123');
  console.log('   📧 Buyer:      rina@tolongin.com / Buyer@123');
  console.log('   📧 Buyer:      aditya@tolongin.com / Buyer@123');
  console.log('═'.repeat(40));

  console.log('\n🎮 SIMULATION NOTES:');
  console.log('   • Services will get auto-orders in ~12 seconds');
  console.log('   • Jobs will get auto-applications in ~10 seconds');
  console.log(
    '   • Orders will auto-progress: ACCEPTED → IN_REVIEW → COMPLETED',
  );
  console.log('   • Check notifications for real-time updates');
  console.log('   • ✅ ALL IMAGES ARE REAL (Pexels/Unsplash) - NO "No Image"');

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
