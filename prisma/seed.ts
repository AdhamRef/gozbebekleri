import { PrismaClient } from '@prisma/client';
import { countryNameFromIsoCode } from '../lib/geo/intl-country-name';

const prisma = new PrismaClient();

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 Starting full database seed...\n');

  // ─────────────────────────────────────────────
  // CLEAN UP (order matters for references)
  // ─────────────────────────────────────────────
  await prisma.auditLog.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.donationItem.deleteMany({});
  await prisma.donationCategoryItem.deleteMany({});
  await prisma.donation.deleteMany({});
  await prisma.subscriptionItem.deleteMany({});
  await prisma.subscriptionCategoryItem.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.postTranslation.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.postCategoryTranslation.deleteMany({});
  await prisma.postCategory.deleteMany({});
  await prisma.updateTranslation.deleteMany({});
  await prisma.update.deleteMany({});
  await prisma.campaignTranslation.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.categoryTranslation.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.badgeTranslation.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.slideTranslation.deleteMany({});
  await prisma.slide.deleteMany({});
  await prisma.liveDonationTicker.deleteMany({});
  await prisma.trackingSettings.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✓ Cleared existing data\n');

  // ─────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: 'مدير النظام',
      email: 'admin@alafiya.org',
      role: 'ADMIN',
      emailVerified: new Date(),
      countryCode: 'SA',
      countryName: countryNameFromIsoCode('SA', 'ar'),
      country: countryNameFromIsoCode('SA', 'ar'),
      city: 'الرياض',
      region: 'منطقة الرياض',
      preferredLang: 'ar',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Sara Al-Rashid',
      email: 'sara@alafiya.org',
      role: 'STAFF',
      emailVerified: new Date(),
      countryCode: 'SA',
      countryName: countryNameFromIsoCode('SA', 'ar'),
      country: countryNameFromIsoCode('SA', 'ar'),
      city: 'جدة',
      region: 'منطقة مكة المكرمة',
      preferredLang: 'ar',
      dashboardPermissions: ['campaigns', 'categories', 'posts', 'users', 'badges', 'slides'],
    },
  });

  await prisma.user.create({
    data: {
      name: 'Khalid Mansour',
      email: 'khalid@alafiya.org',
      role: 'STAFF',
      emailVerified: new Date(),
      countryCode: 'AE',
      countryName: countryNameFromIsoCode('AE', 'ar'),
      country: countryNameFromIsoCode('AE', 'ar'),
      city: 'دبي',
      region: 'دبي',
      preferredLang: 'ar',
      dashboardPermissions: ['donations', 'subscriptions', 'messages', 'referrals', 'tracking'],
    },
  });

  const donorData = [
    { name: 'Ahmed Al-Sayed',     email: 'ahmed.sayed@gmail.com',    country: 'EG', lang: 'ar', phone: '+201001234567' },
    { name: 'Mohammed Al-Qasim',  email: 'mohammed.qasim@gmail.com', country: 'SA', lang: 'ar', phone: '+966501234567' },
    { name: 'Fatima Hassan',      email: 'fatima.hassan@gmail.com',  country: 'MA', lang: 'fr', phone: '+212601234567' },
    { name: 'Omar Abdullah',      email: 'omar.abdullah@gmail.com',  country: 'JO', lang: 'ar', phone: '+962791234567' },
    { name: 'Aisha Ibrahim',      email: 'aisha.ibrahim@gmail.com',  country: 'TN', lang: 'fr', phone: '+21621234567'  },
    { name: 'Yusuf Al-Farsi',     email: 'yusuf.farsi@gmail.com',    country: 'OM', lang: 'ar', phone: '+96891234567'  },
    { name: 'Mariam Khalil',      email: 'mariam.khalil@gmail.com',  country: 'LB', lang: 'ar', phone: '+96171234567'  },
    { name: 'Hassan Nasser',      email: 'hassan.nasser@gmail.com',  country: 'KW', lang: 'ar', phone: '+96551234567'  },
    { name: 'Noor Al-Din',        email: 'noor.aldin@gmail.com',     country: 'IQ', lang: 'ar', phone: '+9647801234567' },
    { name: 'Zainab Qureshi',     email: 'zainab.qureshi@gmail.com', country: 'PK', lang: 'en', phone: '+923001234567' },
    { name: 'Ibrahim Diallo',     email: 'ibrahim.diallo@gmail.com', country: 'SN', lang: 'fr', phone: '+221771234567' },
    { name: 'Khadija Bouali',     email: 'khadija.bouali@gmail.com', country: 'DZ', lang: 'fr', phone: '+213551234567' },
    { name: 'Tariq Rahman',       email: 'tariq.rahman@gmail.com',   country: 'BD', lang: 'en', phone: '+8801711234567' },
    { name: 'Salma Mostafa',      email: 'salma.mostafa@gmail.com',  country: 'EG', lang: 'ar', phone: '+201111234567' },
    { name: 'Ammar Haddad',       email: 'ammar.haddad@gmail.com',   country: 'LY', lang: 'ar', phone: '+218911234567' },
    { name: 'Rana Al-Zahrani',    email: 'rana.zahrani@gmail.com',   country: 'SA', lang: 'ar', phone: '+966551234567' },
    { name: 'Bilal Benali',       email: 'bilal.benali@gmail.com',   country: 'MA', lang: 'fr', phone: '+212661234567' },
    { name: 'Hana Sultani',       email: 'hana.sultani@gmail.com',   country: 'AF', lang: 'en', phone: '+93701234567'  },
    { name: 'Walid Chérif',       email: 'walid.cherif@gmail.com',   country: 'TN', lang: 'fr', phone: '+21629234567'  },
    { name: 'Layla Hussain',      email: 'layla.hussain@gmail.com',  country: 'GB', lang: 'en', phone: '+447911234567' },
  ];

  const donors = await Promise.all(
    donorData.map((d) =>
      prisma.user.create({
        data: {
          name: d.name,
          email: d.email,
          role: 'DONOR',
          emailVerified: new Date(),
          countryCode: d.country,
          countryName: countryNameFromIsoCode(d.country, 'en'),
          country: countryNameFromIsoCode(d.country, 'en'),
          phone: d.phone,
          preferredLang: d.lang,
          createdAt: randomDate(monthsAgo(18), monthsAgo(2)),
        },
      })
    )
  );
  console.log(`✓ Created ${2 + donors.length + 1} users (1 admin, 2 staff, ${donors.length} donors)`);

  // ─────────────────────────────────────────────
  // CATEGORIES
  // ─────────────────────────────────────────────
  const categoriesRaw = [
    {
      name: 'رعاية الأيتام',
      description: 'كفالة الأيتام وتوفير احتياجاتهم الأساسية من تعليم وصحة وسكن',
      order: 1,
      currentAmount: 87500,
      en: { name: 'Orphan Care',        description: 'Sponsoring orphans and providing their basic needs including education, health, and shelter' },
      fr: { name: 'Prise en charge des orphelins', description: "Parrainage des orphelins et fourniture de leurs besoins essentiels" },
    },
    {
      name: 'المياه النقية',
      description: 'توفير مياه الشرب النقية وحفر الآبار للمجتمعات المحرومة',
      order: 2,
      currentAmount: 62000,
      en: { name: 'Clean Water',   description: 'Providing clean drinking water and drilling wells for deprived communities' },
      fr: { name: 'Eau Potable',   description: "Fournir de l'eau potable et creuser des puits pour les communautés défavorisées" },
    },
    {
      name: 'التعليم',
      description: 'دعم التعليم وبناء المدارس وتوفير المنح الدراسية للطلاب المحتاجين',
      order: 3,
      currentAmount: 95000,
      en: { name: 'Education',  description: 'Supporting education, building schools, and providing scholarships for needy students' },
      fr: { name: 'Éducation',  description: "Soutenir l'éducation, construire des écoles et fournir des bourses aux étudiants dans le besoin" },
    },
    {
      name: 'الرعاية الصحية',
      description: 'توفير الرعاية الطبية والأدوية والعمليات الجراحية للمرضى الفقراء',
      order: 4,
      currentAmount: 178000,
      en: { name: 'Healthcare',      description: 'Providing medical care, medicines, and surgeries for poor patients' },
      fr: { name: 'Soins de Santé',  description: 'Fournir des soins médicaux, des médicaments et des chirurgies aux patients pauvres' },
    },
    {
      name: 'إغاثة الطوارئ',
      description: 'الاستجابة الفورية للكوارث الطبيعية والأزمات الإنسانية',
      order: 5,
      currentAmount: 285000,
      en: { name: 'Emergency Relief',   description: 'Immediate response to natural disasters and humanitarian crises' },
      fr: { name: "Secours d'Urgence",  description: "Réponse immédiate aux catastrophes naturelles et aux crises humanitaires" },
    },
    {
      name: 'كفالة العائلات',
      description: 'دعم العائلات الفقيرة والمعوزة بتوفير الغذاء والكساء والمأوى',
      order: 6,
      currentAmount: 41000,
      en: { name: 'Family Sponsorship',   description: 'Supporting poor and needy families with food, clothing, and shelter' },
      fr: { name: 'Parrainage Familial',  description: 'Soutenir les familles pauvres et nécessiteuses avec de la nourriture, des vêtements et un abri' },
    },
  ];

  const categories = await Promise.all(
    categoriesRaw.map(async (cat) => {
      const category = await prisma.category.create({
        data: {
          name: cat.name,
          description: cat.description,
          order: cat.order,
          currentAmount: cat.currentAmount,
        },
      });
      await prisma.categoryTranslation.createMany({
        data: [
          { categoryId: category.id, locale: 'en', name: cat.en.name, description: cat.en.description },
          { categoryId: category.id, locale: 'fr', name: cat.fr.name, description: cat.fr.description },
        ],
      });
      return category;
    })
  );
  console.log(`✓ Created ${categories.length} categories`);

  // ─────────────────────────────────────────────
  // CAMPAIGNS
  // ─────────────────────────────────────────────
  type CampaignRaw = {
    title: string; description: string; targetAmount: number; currentAmount: number;
    categoryIndex: number; goalType: string; fundraisingMode: string; priority: number;
    sharePriceUSD?: number; suggestedDonations?: object; suggestedShareCounts?: object;
    en: { title: string; description: string };
    fr: { title: string; description: string };
  };

  const campaignsRaw: CampaignRaw[] = [
    /* ── Orphan Care ───────────────────────────── */
    {
      title: 'كفالة 100 يتيم في اليمن',
      description:
        'يعاني آلاف الأطفال في اليمن من الحرمان وفقدان الوالدين جراء النزاع المسلح. مشروعنا يهدف إلى كفالة 100 يتيم وتوفير التعليم والغذاء والرعاية الصحية الكاملة لهم لمدة عام كامل.',
      targetAmount: 150000,
      currentAmount: 87500,
      categoryIndex: 0,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 1,
      en: {
        title: 'Sponsor 100 Orphans in Yemen',
        description:
          'Thousands of children in Yemen suffer from deprivation and loss of parents due to armed conflict. Our project aims to sponsor 100 orphans and provide complete education, food, and healthcare for a full year.',
      },
      fr: {
        title: 'Parrainer 100 Orphelins au Yémen',
        description:
          "Des milliers d'enfants au Yémen souffrent de privation et de perte de parents en raison du conflit armé. Notre projet vise à parrainer 100 orphelins.",
      },
    },
    {
      title: 'مدرسة الأمل لأطفال سوريا',
      description:
        'بناء مدرسة متكاملة تستوعب 500 طفل يتيم في شمال سوريا، تضم فصولاً دراسية ومكتبة ومختبراً علمياً وملاعب للأطفال.',
      targetAmount: 200000,
      currentAmount: 143000,
      categoryIndex: 0,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 2,
      en: {
        title: 'Hope School for Syrian Children',
        description:
          'Building an integrated school accommodating 500 orphaned children in northern Syria, including classrooms, library, science lab, and playgrounds.',
      },
      fr: {
        title: "École de l'Espoir pour les Enfants Syriens",
        description:
          "Construction d'une école intégrée accueillant 500 enfants orphelins dans le nord de la Syrie, comprenant des salles de classe, une bibliothèque, un laboratoire et des terrains de jeux.",
      },
    },
    /* ── Clean Water ────────────────────────────── */
    {
      title: 'آبار المياه في أفريقيا',
      description:
        'حفر آبار مياه جوفية في المناطق الأفريقية المحرومة. كل بئر توفر المياه النقية لأكثر من 500 شخص وتنقذ حياة الأطفال من أمراض المياه الملوثة.',
      targetAmount: 75000,
      currentAmount: 62000,
      categoryIndex: 1,
      goalType: 'FIXED',
      fundraisingMode: 'SHARES',
      sharePriceUSD: 500,
      suggestedShareCounts: { counts: [1, 2, 5, 10] },
      priority: 3,
      en: {
        title: 'Water Wells in Africa',
        description:
          'Drilling groundwater wells in deprived African regions. Each well provides clean water to over 500 people and saves children from waterborne diseases.',
      },
      fr: {
        title: "Puits d'Eau en Afrique",
        description:
          "Creuser des puits d'eau souterraine dans les régions africaines défavorisées. Chaque puits fournit de l'eau potable à plus de 500 personnes.",
      },
    },
    {
      title: 'محطة تحلية مياه في الصومال',
      description:
        'إنشاء محطة صغيرة لتحلية مياه البحر تخدم 3 قرى ساحلية في الصومال، توفر مياهاً صالحة للشرب لأكثر من 2000 نسمة.',
      targetAmount: 120000,
      currentAmount: 45000,
      categoryIndex: 1,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 4,
      en: {
        title: 'Water Desalination Station in Somalia',
        description:
          'Establishing a small seawater desalination station serving 3 coastal villages in Somalia, providing drinking water for over 2,000 people.',
      },
      fr: {
        title: "Station de Dessalement d'Eau en Somalie",
        description:
          "Établissement d'une petite station de dessalement d'eau de mer desservant 3 villages côtiers en Somalie.",
      },
    },
    /* ── Education ───────────────────────────────── */
    {
      title: 'منح دراسية لأبناء اللاجئين',
      description:
        'توفير منح دراسية كاملة لـ 200 طالب من أبناء اللاجئين السوريين والفلسطينيين في لبنان والأردن لمواصلة تعليمهم الجامعي.',
      targetAmount: 180000,
      currentAmount: 95000,
      categoryIndex: 2,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 5,
      en: {
        title: 'Scholarships for Refugee Children',
        description:
          'Providing full scholarships for 200 students from Syrian and Palestinian refugee families in Lebanon and Jordan to continue their university education.',
      },
      fr: {
        title: 'Bourses pour les Enfants Réfugiés',
        description:
          'Fournir des bourses complètes à 200 étudiants issus de familles réfugiées syriennes et palestiniennes au Liban et en Jordanie.',
      },
    },
    {
      title: 'تجهيز مدارس قرى نيجيريا',
      description:
        'توفير الكتب والحقائب المدرسية وتجهيزات الفصول لـ 1000 تلميذ في قرى نيجيريا النائية التي تفتقر لأدنى مقومات التعليم.',
      targetAmount: 50000,
      currentAmount: 38000,
      categoryIndex: 2,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 6,
      en: {
        title: 'Equipping Schools in Nigerian Villages',
        description:
          'Providing books, school bags, and classroom equipment for 1,000 students in remote Nigerian villages lacking basic educational necessities.',
      },
      fr: {
        title: 'Équipement des Écoles dans les Villages Nigérians',
        description:
          "Fournir des livres, des sacs scolaires et du matériel de classe à 1 000 élèves dans des villages reculés du Nigeria.",
      },
    },
    /* ── Healthcare ─────────────────────────────── */
    {
      title: 'عمليات القلب للأطفال',
      description:
        'تمويل عمليات القلب المفتوح لـ 50 طفلاً مريضاً في اليمن وسوريا لا تستطيع أسرهم تحمل تكاليفها. كل عملية تمنح طفلاً فرصة جديدة في الحياة.',
      targetAmount: 250000,
      currentAmount: 178000,
      categoryIndex: 3,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 7,
      en: {
        title: 'Heart Surgeries for Children',
        description:
          'Funding open-heart surgeries for 50 sick children in Yemen and Syria whose families cannot afford the costs. Each surgery gives a child a new chance at life.',
      },
      fr: {
        title: 'Chirurgies Cardiaques pour les Enfants',
        description:
          "Financement de chirurgies cardiaques à cœur ouvert pour 50 enfants malades au Yémen et en Syrie dont les familles ne peuvent pas se permettre les coûts.",
      },
    },
    {
      title: 'عيادات طبية متنقلة في المخيمات',
      description:
        'تشغيل 5 عيادات طبية متنقلة في مخيمات اللاجئين بالأردن وتركيا، تقدم الرعاية الطبية الأساسية والأدوية مجاناً للمرضى الفقراء.',
      targetAmount: 90000,
      currentAmount: 67000,
      categoryIndex: 3,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 8,
      en: {
        title: 'Mobile Medical Clinics in Refugee Camps',
        description:
          'Operating 5 mobile medical clinics in refugee camps in Jordan and Turkey, providing basic medical care and medicines free of charge to poor patients.',
      },
      fr: {
        title: 'Cliniques Médicales Mobiles dans les Camps de Réfugiés',
        description:
          "Exploitation de 5 cliniques médicales mobiles dans des camps de réfugiés en Jordanie et en Turquie, fournissant des soins médicaux de base gratuitement.",
      },
    },
    /* ── Emergency Relief ───────────────────────── */
    {
      title: 'إغاثة متضرري فيضانات باكستان',
      description:
        'استجابة عاجلة لضحايا الفيضانات المدمرة في باكستان. توزيع حزم الغذاء والمياه والخيام ومستلزمات الإسعاف على آلاف الأسر المشردة.',
      targetAmount: 300000,
      currentAmount: 285000,
      categoryIndex: 4,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 9,
      en: {
        title: 'Pakistan Flood Victims Relief',
        description:
          'Emergency response to victims of devastating floods in Pakistan. Distributing food, water, tents, and first aid supplies to thousands of displaced families.',
      },
      fr: {
        title: 'Secours aux Victimes des Inondations au Pakistan',
        description:
          "Réponse d'urgence aux victimes des inondations dévastatrices au Pakistan. Distribution de nourriture, d'eau, de tentes et de fournitures de premiers secours.",
      },
    },
    {
      title: 'إعادة بناء المنازل بعد الزلزال',
      description:
        'إعادة بناء المنازل المدمرة لضحايا زلزال تركيا وسوريا. كل مبلغ 5000 دولار يوفر منزلاً جديداً لعائلة فقدت كل شيء.',
      targetAmount: 500000,
      currentAmount: 312000,
      categoryIndex: 4,
      goalType: 'FIXED',
      fundraisingMode: 'SHARES',
      sharePriceUSD: 5000,
      suggestedShareCounts: { counts: [1, 2, 3, 5] },
      priority: 10,
      en: {
        title: 'Rebuilding Homes After the Earthquake',
        description:
          "Rebuilding destroyed homes for victims of the Turkey-Syria earthquake. Every $5,000 provides a new home for a family that lost everything.",
      },
      fr: {
        title: 'Reconstruction des Maisons Après le Tremblement de Terre',
        description:
          "Reconstruction des maisons détruites pour les victimes du séisme Turquie-Syrie. Chaque 5 000 $ fournit une nouvelle maison à une famille qui a tout perdu.",
      },
    },
    /* ── Family Sponsorship ─────────────────────── */
    {
      title: 'سلة غذاء رمضان',
      description:
        'توزيع سلال غذائية متكاملة على 5000 أسرة فقيرة خلال شهر رمضان المبارك، تحتوي على مواد غذائية أساسية تكفي لشهر كامل.',
      targetAmount: 100000,
      currentAmount: 78000,
      categoryIndex: 5,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      suggestedDonations: { amounts: [25, 50, 100, 200] },
      priority: 11,
      en: {
        title: 'Ramadan Food Basket',
        description:
          'Distributing comprehensive food baskets to 5,000 poor families during the holy month of Ramadan, containing basic foodstuffs sufficient for a full month.',
      },
      fr: {
        title: 'Panier Alimentaire du Ramadan',
        description:
          "Distribution de paniers alimentaires complets à 5 000 familles pauvres pendant le mois sacré du Ramadan, contenant des denrées alimentaires de base.",
      },
    },
    {
      title: 'كساء الشتاء للعائلات المحتاجة',
      description:
        'توفير ملابس شتوية دافئة ومعاطف وأحذية وبطاطين لـ 2000 عائلة في المناطق الباردة بأفغانستان وشمال سوريا.',
      targetAmount: 60000,
      currentAmount: 41000,
      categoryIndex: 5,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      priority: 12,
      en: {
        title: 'Winter Clothing for Needy Families',
        description:
          'Providing warm winter clothing, coats, shoes, and blankets for 2,000 families in cold regions of Afghanistan and northern Syria.',
      },
      fr: {
        title: 'Vêtements Hiver pour les Familles Nécessiteuses',
        description:
          "Fourniture de vêtements d'hiver chauds, manteaux, chaussures et couvertures à 2 000 familles dans les régions froides d'Afghanistan et du nord de la Syrie.",
      },
    },
  ];

  const campaigns = await Promise.all(
    campaignsRaw.map(async (c) => {
      const campaign = await prisma.campaign.create({
        data: {
          title: c.title,
          description: c.description,
          targetAmount: c.targetAmount,
          currentAmount: c.currentAmount,
          categoryId: categories[c.categoryIndex].id,
          isActive: true,
          priority: c.priority,
          goalType: c.goalType,
          fundraisingMode: c.fundraisingMode,
          sharePriceUSD: c.sharePriceUSD ?? null,
          suggestedDonations: c.suggestedDonations ?? null,
          suggestedShareCounts: c.suggestedShareCounts ?? null,
          images: [
            `https://picsum.photos/seed/campaign${c.priority}/800/500`,
          ],
          createdAt: randomDate(monthsAgo(14), monthsAgo(2)),
        },
      });

      await prisma.campaignTranslation.createMany({
        data: [
          { campaignId: campaign.id, locale: 'en', title: c.en.title, description: c.en.description },
          { campaignId: campaign.id, locale: 'fr', title: c.fr.title, description: c.fr.description },
        ],
      });

      return campaign;
    })
  );
  console.log(`✓ Created ${campaigns.length} campaigns`);

  // ─────────────────────────────────────────────
  // CAMPAIGN UPDATES
  // ─────────────────────────────────────────────
  const updatesRaw = [
    {
      campaignIndex: 0,
      title: 'تقرير أكتوبر: تم كفالة 45 يتيماً',
      description:
        'بفضل تبرعاتكم الكريمة، تمكنا من كفالة 45 يتيماً في محافظة تعز وإدراجهم في المدارس المحلية. جميعهم يحظون الآن بوجبات يومية ورعاية صحية منتظمة.',
      en: { title: 'October Report: 45 Orphans Sponsored', description: 'Thanks to your generous donations, we sponsored 45 orphans in Taiz governorate and enrolled them in local schools. All receive daily meals and regular healthcare.' },
      fr: { title: "Rapport d'Octobre : 45 Orphelins Parrainés", description: "Grâce à vos généreux dons, nous avons parrainé 45 orphelins dans le gouvernorat de Taiz et les avons inscrits dans des écoles locales." },
    },
    {
      campaignIndex: 0,
      title: 'تقرير ديسمبر: الوصول إلى 80 يتيماً',
      description:
        'وصلنا إلى 80% من هدفنا. تمت كفالة 80 يتيماً حتى الآن، ونواصل جمع التبرعات لاستكمال الـ 100. شكراً لكل متبرع كريم.',
      en: { title: 'December Report: 80 Orphans Reached', description: 'We have reached 80% of our goal. 80 orphans have been sponsored so far. Thank you to every generous donor.' },
      fr: { title: 'Rapport Décembre : 80 Orphelins Atteints', description: "Nous avons atteint 80% de notre objectif. 80 orphelins ont été parrainés jusqu'à présent." },
    },
    {
      campaignIndex: 2,
      title: 'اكتمل حفر البئر الثامنة في تنزانيا',
      description:
        'اكتملت أعمال حفر وتجهيز البئر الثامنة في قرية Mkuranga بتنزانيا. البئر الآن تخدم أكثر من 600 شخص يومياً وأنهت رحلة المشي اليومية لساعتين.',
      en: { title: 'Eighth Well Completed in Tanzania', description: 'The eighth well in Mkuranga village, Tanzania is complete. It now serves over 600 people daily, ending the 2-hour daily water walk.' },
      fr: { title: 'Huitième Puits Terminé en Tanzanie', description: "Le huitième puits dans le village de Mkuranga, en Tanzanie, est terminé. Il dessert maintenant plus de 600 personnes par jour." },
    },
    {
      campaignIndex: 6,
      title: 'نجاح 12 عملية قلب مفتوح هذا الشهر',
      description:
        'الحمد لله، نجحت هذا الشهر 12 عملية قلب مفتوح لأطفال تتراوح أعمارهم بين 3 و12 سنة. الأطفال في تعافٍ جيد ويعيشون بصحة وعافية.',
      en: { title: '12 Open-Heart Surgeries Successful This Month', description: 'Alhamdulillah, 12 open-heart surgeries for children aged 3–12 were successfully completed. The children are recovering well.' },
      fr: { title: '12 Chirurgies Cardiaques Réussies Ce Mois', description: "Alhamdulillah, 12 chirurgies cardiaques à cœur ouvert pour des enfants de 3 à 12 ans ont été réalisées avec succès ce mois-ci." },
    },
    {
      campaignIndex: 8,
      title: 'توزيع 3000 حزمة إغاثة في باكستان',
      description:
        'تم توزيع أكثر من 3000 حزمة غذائية وإغاثية على الأسر المتضررة من الفيضانات في إقليم السند. نواصل العمل على الأرض.',
      en: { title: '3,000 Relief Packages Distributed in Pakistan', description: 'More than 3,000 food and relief packages have been distributed to flood-affected families in Sindh province. We continue our ground operations.' },
      fr: { title: '3 000 Colis de Secours Distribués au Pakistan', description: "Plus de 3 000 colis alimentaires et de secours ont été distribués aux familles touchées par les inondations dans la province du Sind." },
    },
  ];

  for (const u of updatesRaw) {
    const update = await prisma.update.create({
      data: {
        title: u.title,
        description: u.description,
        campaignId: campaigns[u.campaignIndex].id,
        createdAt: randomDate(monthsAgo(4), daysAgo(7)),
      },
    });
    await prisma.updateTranslation.createMany({
      data: [
        { updateId: update.id, locale: 'en', title: u.en.title, description: u.en.description },
        { updateId: update.id, locale: 'fr', title: u.fr.title, description: u.fr.description },
      ],
    });
  }
  console.log(`✓ Created ${updatesRaw.length} campaign updates`);

  // ─────────────────────────────────────────────
  // REFERRALS
  // ─────────────────────────────────────────────
  const referrals = await Promise.all([
    prisma.referral.create({ data: { code: 'tiktok',      name: 'TikTok Campaign',        cookieExpiryDays: 30 } }),
    prisma.referral.create({ data: { code: 'instagram',   name: 'Instagram Ads',           cookieExpiryDays: 30 } }),
    prisma.referral.create({ data: { code: 'facebook',    name: 'Facebook Ads',            cookieExpiryDays: 14 } }),
    prisma.referral.create({ data: { code: 'ramadan2024', name: 'مشروع رمضان 2024',         cookieExpiryDays: 60 } }),
    prisma.referral.create({ data: { code: 'youtube',     name: 'YouTube Channel',         cookieExpiryDays: 30 } }),
  ]);
  console.log(`✓ Created ${referrals.length} referral codes`);

  // ─────────────────────────────────────────────
  // DONATIONS  (60 donations spread over 12 months)
  // ─────────────────────────────────────────────
  const donationAmounts = [25, 50, 100, 150, 200, 250, 500, 1000, 50, 75, 30, 100, 200, 150, 500, 300, 75, 50, 100, 250];
  const currencies     = ['USD', 'USD', 'USD', 'EUR', 'SAR', 'USD', 'GBP', 'USD', 'USD', 'TRY'];
  const usdRates: Record<string, number> = { USD: 1, EUR: 1.1, SAR: 0.27, GBP: 1.28, TRY: 0.031 };

  const createdDonations: { id: string; campaignId: string }[] = [];

  for (let i = 0; i < 65; i++) {
    const donor    = donors[i % donors.length];
    const campaign = campaigns[i % campaigns.length];
    const amount   = donationAmounts[i % donationAmounts.length];
    const currency = currencies[i % currencies.length];
    const rate     = usdRates[currency] ?? 1;
    const amountUSD = parseFloat((amount * rate).toFixed(2));

    const status: 'PAID' | 'FAILED' =
      i < 59 ? 'PAID' : 'FAILED';

    const referral     = i % 5 === 0 ? referrals[i % referrals.length] : null;
    const donationDate = randomDate(monthsAgo(12), daysAgo(1));
    const coverFees    = i % 4 === 0;
    const fees         = coverFees ? parseFloat((amount * 0.03).toFixed(2)) : 0;

    const donation = await prisma.donation.create({
      data: {
        amount,
        amountUSD,
        currency,
        teamSupport: 0,
        coverFees,
        fees,
        totalAmount: parseFloat((amount + fees).toFixed(2)),
        status,
        locale: donor.preferredLang ?? 'ar',
        donorId: donor.id,
        referralId: referral?.id ?? null,
        paymentMethod: 'CARD',
        provider: 'PAYFOR',
        providerOrderId: `ORD-2024-${String(i + 1).padStart(5, '0')}`,
        providerTxnResult: status === 'PAID' ? 'Success' : status === 'FAILED' ? 'Failed' : null,
        providerProcReturnCode: status === 'PAID' ? '00' : null,
        providerAuthCode: status === 'PAID' ? `AUTH${100000 + i}` : null,
        cardDetails: {
          cardNumber: `**** **** **** ${String(1000 + i).slice(-4)}`,
          expiryDate: '12/27',
          cvv: '***',
          cardholderName: donor.name ?? 'Unknown',
        },
        createdAt: donationDate,
        paidAt: status === 'PAID' ? donationDate : null,
      },
    });

    await prisma.donationItem.create({
      data: {
        donationId: donation.id,
        campaignId: campaign.id,
        amount,
        amountUSD,
        createdAt: donationDate,
      },
    });

    createdDonations.push({ id: donation.id, campaignId: campaign.id });
  }
  console.log(`✓ Created 65 donations`);

  // ─────────────────────────────────────────────
  // SUBSCRIPTIONS  (12 monthly donors)
  // ─────────────────────────────────────────────
  const subStatuses: ('ACTIVE' | 'PAUSED' | 'CANCELLED')[] = [
    'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
    'ACTIVE', 'PAUSED', 'ACTIVE', 'ACTIVE', 'CANCELLED',
    'ACTIVE', 'PAUSED',
  ];
  const subAmounts = [25, 50, 100, 150, 50, 200, 100, 75, 50, 100, 150, 200];

  for (let i = 0; i < 12; i++) {
    const donor    = donors[i % donors.length];
    const campaign = campaigns[i % campaigns.length];
    const amount   = subAmounts[i];
    const subDate  = randomDate(monthsAgo(12), monthsAgo(1));
    const nextDay = (i % 28) + 1;

    const sub = await prisma.subscription.create({
      data: {
        status: subStatuses[i],
        amount,
        amountUSD: amount,
        currency: 'USD',
        teamSupport: 0,
        coverFees: false,
        paymentMethod: 'CARD',
        donorId: donor.id,
        nextBillingDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, nextDay),
        lastBillingDate: subDate,
        createdAt: subDate,
      },
    });

    await prisma.subscriptionItem.create({
      data: {
        subscriptionId: sub.id,
        campaignId: campaign.id,
        amount,
        amountUSD: amount,
        createdAt: subDate,
      },
    });
  }
  console.log(`✓ Created 12 subscriptions`);

  // ─────────────────────────────────────────────
  // COMMENTS
  // ─────────────────────────────────────────────
  const commentTexts = [
    'جزاكم الله خيراً على هذا العمل النبيل',
    'بارك الله فيكم وفي جهودكم الإنسانية',
    'اللهم تقبل منا ومنكم صالح الأعمال',
    'مبادرة رائعة، ندعم هذا المشروع بكل قوة',
    'May Allah reward you for this noble work',
    'Keep up the amazing work, this truly makes a difference',
    'Que Allah vous bénisse pour ce travail humanitaire',
    'نتابع أعمالكم باستمرار وندعو الله أن يوفقكم',
    'شكراً لكل من ساهم في هذه المبادرة الإنسانية',
    'اللهم اجعله في ميزان حسناتنا جميعاً',
    'لله درّكم، أعمال تتكلم عن نفسها',
    'Masha Allah, incredible work for our ummah!',
    'وصلت أخبار مشروعكم إلى بلدي وأبهجتنا كثيراً',
    'تبرعت ولن أندم أبداً، مشروع إنساني حقيقي',
    'Très fier de soutenir cette initiative humanitaire',
  ];

  for (let i = 0; i < 25; i++) {
    await prisma.comment.create({
      data: {
        text: commentTexts[i % commentTexts.length],
        userId: donors[i % donors.length].id,
        campaignId: campaigns[i % campaigns.length].id,
        donationId: i < createdDonations.length ? createdDonations[i].id : null,
        createdAt: randomDate(monthsAgo(8), daysAgo(1)),
      },
    });
  }
  console.log(`✓ Created 25 comments`);

  // ─────────────────────────────────────────────
  // BADGES
  // ─────────────────────────────────────────────
  const badgesRaw = [
    { name: 'المتبرع المبتدئ',  color: '#10b981', criteria: { type: 'DONATION_COUNT_MIN', count: 1 },                           order: 1, en: 'First-time Donor',   fr: 'Premier Donateur'     },
    { name: 'داعم الخير',        color: '#3b82f6', criteria: { type: 'TOTAL_LIFETIME', amountMinUSD: 100 },                     order: 2, en: 'Good Supporter',      fr: 'Soutien du Bien'      },
    { name: 'المتبرع الفضي',     color: '#94a3b8', criteria: { type: 'TOTAL_LIFETIME', amountMinUSD: 500 },                     order: 3, en: 'Silver Donor',        fr: 'Donateur Argent'      },
    { name: 'المتبرع الذهبي',    color: '#f59e0b', criteria: { type: 'TOTAL_LIFETIME', amountMinUSD: 1000 },                    order: 4, en: 'Gold Donor',           fr: 'Donateur Or'          },
    { name: 'المتبرع الماسي',    color: '#8b5cf6', criteria: { type: 'TOTAL_LIFETIME', amountMinUSD: 5000 },                    order: 5, en: 'Diamond Donor',       fr: 'Donateur Diamant'     },
    { name: 'المتبرع الوفي',     color: '#ef4444', criteria: { type: 'ANY_SPAN_N_MONTHS', months: 6, amountMinUSD: 50 },       order: 6, en: 'Loyal Donor',         fr: 'Donateur Fidèle'      },
    { name: 'محارب الشتاء',      color: '#0ea5e9', criteria: { type: 'MONTHLY_ACTIVE_RANGE', months: 3, amountMinUSD: 25 },    order: 7, en: 'Winter Warrior',      fr: 'Guerrier de l\'Hiver' },
  ];

  for (const b of badgesRaw) {
    const badge = await prisma.badge.create({
      data: { name: b.name, color: b.color, criteria: b.criteria, order: b.order },
    });
    await prisma.badgeTranslation.createMany({
      data: [
        { badgeId: badge.id, locale: 'en', name: b.en },
        { badgeId: badge.id, locale: 'fr', name: b.fr },
      ],
    });
  }
  console.log(`✓ Created ${badgesRaw.length} badges`);

  // ─────────────────────────────────────────────
  // SLIDES
  // ─────────────────────────────────────────────
  const slidesRaw = [
    {
      title: 'معاً نبني مستقبلاً أفضل',
      description: 'تبرعك اليوم يغير حياة آلاف الأسر المحتاجة حول العالم. انضم إلينا في مسيرة العطاء.',
      buttonText: 'تبرع الآن',
      buttonLink: '/campaigns',
      order: 1,
      en: { title: 'Together We Build a Better Future',           description: 'Your donation today changes the lives of thousands of needy families around the world. Join us on the journey of giving.', buttonText: 'Donate Now'          },
      fr: { title: 'Ensemble Nous Construisons un Meilleur Avenir', description: "Votre don d'aujourd'hui change la vie de milliers de familles dans le besoin. Rejoignez-nous.",                              buttonText: 'Donnez Maintenant'    },
    },
    {
      title: 'كفل يتيماً وانل بره',
      description: 'أنت وكافل اليتيم كهاتين في الجنة. ابدأ رحلتك مع الأيتام اليوم وكن سبب ابتسامتهم.',
      buttonText: 'اكفل يتيماً',
      buttonLink: '/campaigns',
      order: 2,
      en: { title: 'Sponsor an Orphan, Earn His Kindness', description: 'You and the sponsor of an orphan will be like these two fingers in paradise. Start your journey with orphans today.', buttonText: 'Sponsor an Orphan'   },
      fr: { title: 'Parrainez un Orphelin',                description: "Vous et le parrain d'un orphelin serez ensemble au paradis. Commencez votre voyage avec les orphelins aujourd'hui.",     buttonText: 'Parrainer un Orphelin' },
    },
    {
      title: 'المياه النقية حق للجميع',
      description: 'ملايين البشر يفتقرون إلى الماء النقي. بئر واحدة تنقذ قرية بأكملها. ساهم في حفر بئر الآن.',
      buttonText: 'ساهم في بئر',
      buttonLink: '/campaigns',
      order: 3,
      en: { title: 'Clean Water is a Right for All',     description: 'Millions of people lack clean water. One well saves an entire village. Contribute to digging a well now.', buttonText: 'Contribute to a Well'  },
      fr: { title: "L'Eau Potable est un Droit pour Tous", description: "Des millions de personnes manquent d'eau potable. Un puits sauve tout un village.",                       buttonText: "Contribuer à un Puits"  },
    },
    {
      title: 'إغاثة طارئة — كن جزءاً من الحل',
      description: 'الكوارث لا تنتظر. تبرعك الفوري يصل في الوقت الحرج لمن هم في أمسّ الحاجة إليه.',
      buttonText: 'أغِث الآن',
      buttonLink: '/campaigns',
      order: 4,
      en: { title: 'Emergency Relief — Be Part of the Solution', description: 'Disasters don\'t wait. Your immediate donation reaches those in critical need at the right moment.', buttonText: 'Donate Now'          },
      fr: { title: "Secours d'Urgence — Faites Partie de la Solution", description: "Les catastrophes n'attendent pas. Votre don immédiat parvient à ceux qui en ont le plus besoin.",         buttonText: 'Donnez Maintenant'    },
    },
  ];

  for (const s of slidesRaw) {
    const slide = await prisma.slide.create({
      data: {
        title: s.title,
        description: s.description,
        showButton: true,
        buttonText: s.buttonText,
        buttonLink: s.buttonLink,
        isActive: true,
        order: s.order,
      },
    });
    await prisma.slideTranslation.createMany({
      data: [
        { slideId: slide.id, locale: 'en', title: s.en.title, description: s.en.description, buttonText: s.en.buttonText },
        { slideId: slide.id, locale: 'fr', title: s.fr.title, description: s.fr.description, buttonText: s.fr.buttonText },
      ],
    });
  }
  console.log(`✓ Created ${slidesRaw.length} hero slides`);

  // ─────────────────────────────────────────────
  // POST CATEGORIES
  // ─────────────────────────────────────────────
  const postCatsRaw = [
    {
      name: 'أخبار المنظمة',
      title: 'آخر أخبار مؤسسة العافية',
      description: 'تابع آخر أخبار وأنشطة مؤسسة العافية الخيرية',
      en: { name: 'Organization News',       title: 'Latest Al-Afiya Foundation News',           description: 'Follow the latest news and activities of Al-Afiya Charitable Foundation' },
      fr: { name: "Nouvelles de l'Organisation", title: 'Dernières Nouvelles de la Fondation Al-Afiya', description: "Suivez les dernières nouvelles et activités de la Fondation caritative Al-Afiya" },
    },
    {
      name: 'قصص النجاح',
      title: 'قصص حقيقية من قلب الميدان',
      description: 'قصص ملهمة لأشخاص حقيقيين غيّرت حياتهم تبرعاتكم',
      en: { name: 'Success Stories',  title: 'Real Stories from the Field',       description: 'Inspiring stories of real people whose lives your donations have changed' },
      fr: { name: 'Histoires de Succès', title: 'Histoires Réelles du Terrain', description: "Histoires inspirantes de vraies personnes dont vos dons ont changé la vie" },
    },
    {
      name: 'توعية وتثقيف',
      title: 'مقالات توعوية عن العمل الخيري',
      description: 'مقالات ودراسات حول أهمية العمل الخيري وأثره في المجتمع',
      en: { name: 'Awareness & Education', title: 'Educational Articles on Charity', description: 'Articles and studies on the importance of charitable work and its impact on society' },
      fr: { name: 'Sensibilisation et Éducation', title: 'Articles Éducatifs sur la Charité', description: "Articles et études sur l'importance du travail caritatif et son impact sur la société" },
    },
  ];

  const postCategories = await Promise.all(
    postCatsRaw.map(async (pc) => {
      const cat = await prisma.postCategory.create({
        data: { name: pc.name, title: pc.title, description: pc.description },
      });
      await prisma.postCategoryTranslation.createMany({
        data: [
          { categoryId: cat.id, locale: 'en', name: pc.en.name, title: pc.en.title, description: pc.en.description },
          { categoryId: cat.id, locale: 'fr', name: pc.fr.name, title: pc.fr.title, description: pc.fr.description },
        ],
      });
      return cat;
    })
  );
  console.log(`✓ Created ${postCategories.length} post categories`);

  // ─────────────────────────────────────────────
  // POSTS
  // ─────────────────────────────────────────────
  const postsRaw = [
    {
      title: 'تقرير سنوي 2024: إنجازات مؤسسة العافية',
      description: 'استعراض شامل لإنجازات ومشاريع مؤسسة العافية خلال عام 2024',
      content: '<h2>إنجازات عام 2024</h2><p>تفخر مؤسسة العافية بتقديم تقريرها السنوي لعام 2024. بفضل دعمكم الكريم، حققنا إنجازات استثنائية على أرض الواقع.</p><h3>أبرز الأرقام</h3><ul><li>كفالة أكثر من 500 يتيم في 8 دول</li><li>حفر 23 بئر مياه نظيفة في إفريقيا</li><li>تمويل 150 عملية جراحية للأطفال</li><li>توزيع 10,000 سلة غذائية على الأسر المحتاجة</li><li>تشغيل 8 عيادات متنقلة في مخيمات اللاجئين</li></ul><p>شكراً لكل متبرع ومتبرعة كانوا شركاء في هذه الإنجازات.</p>',
      published: true,
      categoryIndex: 0,
      en: {
        title: '2024 Annual Report: Al-Afiya Foundation Achievements',
        description: "A comprehensive review of Al-Afiya Foundation's achievements and projects during 2024",
        content: '<h2>2024 Achievements</h2><p>Al-Afiya Foundation is proud to present its annual report for 2024. Thanks to your generous support, we achieved exceptional results on the ground.</p><h3>Key Figures</h3><ul><li>Sponsored over 500 orphans in 8 countries</li><li>Drilled 23 clean water wells in Africa</li><li>Funded 150 surgeries for children</li><li>Distributed 10,000 food baskets</li></ul>',
      },
      fr: {
        title: 'Rapport Annuel 2024 : Réalisations de la Fondation Al-Afiya',
        description: 'Un examen complet des réalisations et projets de la Fondation Al-Afiya au cours de 2024',
        content: '<h2>Réalisations 2024</h2><p>La Fondation Al-Afiya est fière de présenter son rapport annuel 2024. Grâce à votre généreux soutien, nous avons obtenu des résultats exceptionnels.</p><ul><li>Parrainage de plus de 500 orphelins dans 8 pays</li><li>Creusement de 23 puits d\'eau potable en Afrique</li></ul>',
      },
    },
    {
      title: 'عمر.. الطفل الذي استعاد ابتسامته',
      description: 'وصف الطفل عمر (7 سنوات) الذي وُلد بعيب خلقي في القلب وكيف غيّر تبرعكم حياته',
      content: '<p>وُلد عمر في قرية نائية باليمن يعاني من عيب خلقي خطير في القلب. أخبر الأطباء والديه أن الطفل لن يعيش طويلاً بدون تدخل جراحي مكلف.</p><p>لم تكن عائلته تعلم أن تبرعاً بسيطاً من محسنين كرام سيغير مصيره إلى الأبد. بفضل تبرعات المحسنين عبر مؤسسة العافية، خضع عمر لعملية جراحية ناجحة في مستشفى متخصص في تركيا.</p><p>واليوم يركض ويلعب كأقرانه، وتعلو ابتسامة الأمل وجهه الصغير. قالت والدته: "ظننت أنني سأفقده، لكن الله أرسل لنا أناساً طيبين أعادوا لنا الفرحة."</p>',
      published: true,
      categoryIndex: 1,
      en: {
        title: 'Omar.. The Child Who Regained His Smile',
        description: '7-year-old Omar was born with a congenital heart defect — here is how your donation changed his life',
        content: "<p>Omar was born in a remote village in Yemen with a serious congenital heart defect. Doctors told his parents the child would not live long without costly surgery.</p><p>Thanks to donations through Al-Afiya Foundation, Omar underwent a successful surgery at a specialized hospital in Turkey. Today he runs and plays like his peers. His mother said: 'I thought I would lose him, but God sent kind people who brought joy back to us.'</p>",
      },
      fr: {
        title: 'Omar.. L\'Enfant Qui Retrouva Son Sourire',
        description: 'Omar, 7 ans, est né avec une malformation cardiaque congénitale — voici comment votre don a changé sa vie',
        content: "<p>Omar est né dans un village reculé du Yémen atteint d'une grave malformation cardiaque congénitale. Grâce aux dons via la Fondation Al-Afiya, Omar a subi une chirurgie réussie dans un hôpital spécialisé en Turquie. Aujourd'hui il court et joue comme ses pairs.</p>",
      },
    },
    {
      title: 'فاطمة والبئر التي أنقذت قريتها',
      description: 'كيف غيّر مشروع حفر الآبار حياة فاطمة وعائلتها في تنزانيا',
      content: "<p>كانت فاطمة، وعمرها 12 عاماً، تقطع يومياً مسافة 5 كيلومترات ذهاباً وإياباً لجلب المياه من نهر ملوث. وكانت هذه الرحلة تستغرق ساعتين من يومها، مما حرمها من الذهاب إلى المدرسة بانتظام.</p><p>في إطار مشروع 'آبار المياه في أفريقيا'، تم حفر بئر في قريتها توفر المياه النقية لأكثر من 600 شخص. الآن، فاطمة تتفوق في دراستها وتحلم بأن تصبح طبيبة.</p>",
      published: true,
      categoryIndex: 1,
      en: {
        title: 'Fatima and the Well That Saved Her Village',
        description: "How the well-drilling project changed the life of Fatima and her family in Tanzania",
        content: "<p>12-year-old Fatima used to walk 5 kilometers daily to fetch water from a contaminated river, taking 2 hours from her day and keeping her from attending school regularly.</p><p>As part of the 'Water Wells in Africa' project, a well was drilled in her village providing clean water to over 600 people. Now, Fatima excels in her studies and dreams of becoming a doctor.</p>",
      },
      fr: {
        title: 'Fatima et le Puits Qui Sauva Son Village',
        description: "Comment le projet de creusement de puits a changé la vie de Fatima et de sa famille en Tanzanie",
        content: "<p>Fatima, 12 ans, parcourait quotidiennement 5 kilomètres pour chercher de l'eau dans une rivière polluée, ce qui lui prenait 2 heures. Grâce au puits creusé dans son village, Fatima excelle maintenant dans ses études.</p>",
      },
    },
    {
      title: 'فضل صدقة الجارية في الإسلام',
      description: 'مقال تثقيفي عن فضل صدقة الجارية وأوجه الاستثمار في المشاريع الخيرية الدائمة',
      content: '<h2>صدقة الجارية</h2><p>قال رسول الله ﷺ: "إذا مات الإنسان انقطع عنه عمله إلا من ثلاثة: إلا من صدقة جارية، أو علم ينتفع به، أو ولد صالح يدعو له." (رواه مسلم)</p><h3>أمثلة على صدقة الجارية</h3><ul><li><strong>حفر الآبار:</strong> توفير الماء النقي للناس يجري ثوابه ما بقي الناس ينتفعون بها</li><li><strong>بناء المدارس:</strong> كل طالب يتعلم فيها يجري أجره على المتبرع</li><li><strong>تمويل العمليات الجراحية:</strong> حياة ينقذها تبرعك تستمر في العطاء والإنجاز</li></ul>',
      published: true,
      categoryIndex: 2,
      en: {
        title: 'The Virtue of Ongoing Charity (Sadaqah Jariyah) in Islam',
        description: "An educational article about the virtue of ongoing charity and ways to invest in permanent charitable projects",
        content: '<h2>Sadaqah Jariyah</h2><p>The Prophet ﷺ said: "When a person dies, his deeds come to an end except for three: ongoing charity, knowledge that is benefited from, or a righteous child who prays for him." (Muslim)</p><h3>Examples of Ongoing Charity</h3><ul><li><strong>Drilling wells:</strong> The reward flows as long as people benefit from the water</li><li><strong>Building schools:</strong> Every student who learns earns reward for the donor</li></ul>',
      },
      fr: {
        title: "La Vertu de la Charité Continue (Sadaqah Jariyah) en Islam",
        description: "Un article éducatif sur la vertu de la charité continue et les moyens d'investir dans des projets caritatifs permanents",
        content: '<h2>Sadaqah Jariyah</h2><p>Le Prophète ﷺ a dit: "Quand une personne meurt, ses actions prennent fin sauf pour trois choses: la charité continue, la connaissance dont on bénéficie, ou un enfant vertueux qui prie pour lui."</p>',
      },
    },
    {
      title: 'نتائج مشروع رمضان 2024',
      description: 'إحصائيات ونتائج مفصّلة لمشروع سلال رمضان الغذائية لعام 2024',
      content: '<h2>نتائج مشروع رمضان 2024</h2><p>بحمد الله وبفضل سخاء المتبرعين، استطعنا هذا العام تجاوز هدفنا وتوزيع أكثر من 4,800 سلة غذائية على الأسر المحتاجة في 6 دول.</p><h3>الأرقام والإحصائيات</h3><ul><li>4,832 سلة موزّعة</li><li>6 دول مستفيدة: اليمن، سوريا، غزة، الصومال، نيجيريا، أفغانستان</li><li>أكثر من 24,000 فرد استفاد مباشرة</li><li>1.2 مليون دولار إجمالي التبرعات</li></ul><p>شكر خاص لكل من شارك وساهم في إيصال فرحة رمضان إلى بيوت المحتاجين.</p>',
      published: true,
      categoryIndex: 0,
      en: {
        title: 'Ramadan 2024 Campaign Results',
        description: 'Detailed statistics and results of the Ramadan 2024 food basket campaign',
        content: '<h2>Ramadan 2024 Campaign Results</h2><p>Alhamdulillah, thanks to the generosity of donors, we exceeded our goal and distributed over 4,800 food baskets to needy families in 6 countries.</p><ul><li>4,832 baskets distributed</li><li>6 beneficiary countries</li><li>Over 24,000 direct beneficiaries</li><li>$1.2 million total donations</li></ul>',
      },
      fr: {
        title: 'Résultats de la Campagne Ramadan 2024',
        description: 'Statistiques et résultats détaillés de la campagne de paniers alimentaires du Ramadan 2024',
        content: "<h2>Résultats de la Campagne Ramadan 2024</h2><p>Alhamdulillah, grâce à la générosité des donateurs, nous avons dépassé notre objectif et distribué plus de 4 800 paniers alimentaires à des familles nécessiteuses dans 6 pays.</p>",
      },
    },
    {
      title: 'كيف تختار المشروع الخيري المناسب لتبرعك؟',
      description: 'دليل عملي يساعدك على اختيار المشروع الذي يناسب قدراتك ونيتك',
      content: '<h2>كيف تختار مشروعك الخيري؟</h2><p>مع تعدد المشاريع الخيرية، قد يتساءل بعض المتبرعين: أين أضع تبرعي؟ إليك بعض المعايير المساعدة:</p><h3>1. حسب الأثر</h3><p>المشاريع ذات الأثر الممتد كحفر الآبار وبناء المدارس تستمر في نفع أكبر عدد من الناس لسنوات طويلة.</p><h3>2. حسب الحاجة العاجلة</h3><p>مشاريع الإغاثة الطارئة تحتاج تمويلاً فورياً للاستجابة السريعة للكوارث.</p><h3>3. حسب التخصص</h3><p>إذا كنت من المهتمين بالتعليم، فإن منح الدراسية أو بناء المدارس تناسبك أكثر.</p>',
      published: true,
      categoryIndex: 2,
      en: {
        title: 'How to Choose the Right Charity Project for Your Donation?',
        description: 'A practical guide to help you choose the project that best suits your capacity and intention',
        content: '<h2>How to Choose Your Charity Project?</h2><p>With so many charitable projects, some donors wonder: where should I put my donation? Here are some helpful criteria:</p><h3>1. By Impact</h3><p>Projects with lasting impact like wells and schools continue to benefit large numbers of people for years.</p><h3>2. By Urgent Need</h3><p>Emergency relief projects need immediate funding for rapid disaster response.</p>',
      },
      fr: {
        title: 'Comment Choisir le Bon Projet Caritatif pour Votre Don ?',
        description: "Un guide pratique pour vous aider à choisir le projet qui correspond le mieux à votre capacité et à votre intention",
        content: "<h2>Comment Choisir Votre Projet Caritatif ?</h2><p>Avec de nombreux projets caritatifs, certains donateurs se demandent : où mettre mon don ? Voici quelques critères utiles.</p>",
      },
    },
  ];

  for (const p of postsRaw) {
    const post = await prisma.post.create({
      data: {
        title: p.title,
        description: p.description,
        content: p.content,
        published: p.published,
        categoryId: postCategories[p.categoryIndex].id,
        createdAt: randomDate(monthsAgo(10), daysAgo(3)),
      },
    });
    await prisma.postTranslation.createMany({
      data: [
        { postId: post.id, locale: 'en', title: p.en.title, description: p.en.description, content: p.en.content },
        { postId: post.id, locale: 'fr', title: p.fr.title, description: p.fr.description, content: p.fr.content },
      ],
    });
  }
  console.log(`✓ Created ${postsRaw.length} blog posts`);

  // ─────────────────────────────────────────────
  // MESSAGES
  // ─────────────────────────────────────────────
  type MessageRaw = { subject: 'GENERAL' | 'CAMPAIGN_SUPPORT' | 'PARTNERSHIP' | 'DONATION_ISSUE' | 'VOLUNTEERING' | 'COMPLAINT'; body: string; guestName: string; guestEmail: string; locale: string };

  const messagesRaw: MessageRaw[] = [
    { subject: 'GENERAL',           body: 'أريد الاستفسار عن طرق التبرع المتاحة وكيفية متابعة تبرعاتي', guestName: 'محمد العتيبي',   guestEmail: 'mohammed.otaibi@example.com', locale: 'ar' },
    { subject: 'CAMPAIGN_SUPPORT',  body: 'هل يمكن التبرع لمشروع بعينها وتخصيص المبلغ بالكامل لها فقط؟', guestName: 'سارة الأحمد',    guestEmail: 'sara.ahmad@example.com',      locale: 'ar' },
    { subject: 'PARTNERSHIP',       body: 'We are a humanitarian foundation and would like to explore partnership opportunities with your organization.', guestName: 'Robert Hughes', guestEmail: 'r.hughes@ngo.org', locale: 'en' },
    { subject: 'DONATION_ISSUE',    body: 'تم خصم المبلغ من حسابي البنكي منذ 3 أيام ولم أتلقَّ رسالة تأكيد أو إيصال حتى الآن', guestName: 'خالد منصور', guestEmail: 'khalid.m@example.com', locale: 'ar' },
    { subject: 'VOLUNTEERING',      body: 'Je souhaite me porter volontaire pour vos activités humanitaires en Afrique. Comment puis-je rejoindre votre équipe sur le terrain ?', guestName: 'Ibrahim Coulibaly', guestEmail: 'ibrahim.c@example.com', locale: 'fr' },
    { subject: 'GENERAL',           body: 'I would like to know more about your monthly donation program and how the funds are tracked and reported.', guestName: 'James Wilson', guestEmail: 'james.w@example.com', locale: 'en' },
    { subject: 'COMPLAINT',         body: 'انتظرت أكثر من أسبوع ولم أتلقَّ إيصال التبرع. أتمنى المتابعة في أقرب وقت ممكن.', guestName: 'ليلى حسن', guestEmail: 'layla.h@example.com', locale: 'ar' },
    { subject: 'CAMPAIGN_SUPPORT',  body: 'Comment puis-je organiser une collecte de fonds personnelle pour soutenir l\'une de vos campagnes et partager le lien avec ma famille ?', guestName: 'Marie Dubois', guestEmail: 'marie.d@example.com', locale: 'fr' },
    { subject: 'GENERAL',           body: 'هل تقبلون التبرعات بالذهب أو العينات؟ لدي قطعة ذهبية أريد التبرع بها.', guestName: 'أبو عبدالله الشريف', guestEmail: 'abu.a@example.com', locale: 'ar' },
    { subject: 'PARTNERSHIP',       body: 'نحن شركة خاصة نرغب في تخصيص جزء من أرباحنا السنوية لمشاريعكم. كيف يمكننا التنسيق؟', guestName: 'المدير التنفيذي - شركة النور', guestEmail: 'ceo@alnoor.example.com', locale: 'ar' },
  ];

  for (const m of messagesRaw) {
    await prisma.message.create({
      data: {
        subject: m.subject,
        body: m.body,
        locale: m.locale,
        guestName: m.guestName,
        guestEmail: m.guestEmail,
        createdAt: randomDate(monthsAgo(4), daysAgo(1)),
      },
    });
  }
  console.log(`✓ Created ${messagesRaw.length} contact messages`);

  // ─────────────────────────────────────────────
  // AUDIT LOGS
  // ─────────────────────────────────────────────
  const auditLogsRaw = [
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'CREATE_CAMPAIGN',   messageAr: 'تم إنشاء مشروع: كفالة 100 يتيم في اليمن',          messageEn: 'Created campaign: Sponsor 100 Orphans in Yemen',        entityType: 'Campaign',     stream: 'TEAM' },
    { actorName: 'Sara Al-Rashid', actorRole: 'STAFF', action: 'UPDATE_CAMPAIGN', messageAr: 'تم تحديث مشروع: مدرسة الأمل لأطفال سوريا',           messageEn: 'Updated campaign: Hope School for Syrian Children',     entityType: 'Campaign',     stream: 'TEAM' },
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'CREATE_CATEGORY',   messageAr: 'تم إنشاء فئة: رعاية الأيتام',                       messageEn: 'Created category: Orphan Care',                         entityType: 'Category',     stream: 'TEAM' },
    { actorName: 'Khalid Mansour', actorRole: 'STAFF', action: 'VIEW_DONATIONS',  messageAr: 'استعرض قائمة التبرعات',                              messageEn: 'Viewed donations list',                                 entityType: null,           stream: 'TEAM' },
    { actorName: 'Ahmed Al-Sayed', actorRole: 'DONOR', action: 'DONATION_PAID',   messageAr: 'تم إتمام التبرع بمبلغ 100 دولار',                   messageEn: 'Donation of $100 completed',                           entityType: 'Donation',     stream: 'DONOR' },
    { actorName: 'Mohammed Al-Qasim', actorRole: 'DONOR', action: 'SUBSCRIPTION_CREATED', messageAr: 'تم إنشاء اشتراك شهري بمبلغ 50 دولار',      messageEn: 'Monthly subscription of $50 created',                  entityType: 'Subscription', stream: 'DONOR' },
    { actorName: 'Sara Al-Rashid', actorRole: 'STAFF', action: 'CREATE_POST',     messageAr: 'تم نشر مقال: تقرير سنوي 2024',                      messageEn: 'Published article: 2024 Annual Report',                entityType: 'Post',         stream: 'TEAM' },
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'UPDATE_SETTINGS',   messageAr: 'تم تحديث إعدادات التتبع والتحليلات',               messageEn: 'Tracking and analytics settings updated',              entityType: null,           stream: 'TEAM' },
    { actorName: 'Fatima Hassan', actorRole: 'DONOR', action: 'DONATION_PAID',     messageAr: 'تم إتمام التبرع بمبلغ 200 دولار',                   messageEn: 'Donation of $200 completed',                           entityType: 'Donation',     stream: 'DONOR' },
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'CREATE_BADGE',      messageAr: 'تم إنشاء شارة: المتبرع الذهبي',                     messageEn: 'Created badge: Gold Donor',                            entityType: 'Badge',        stream: 'TEAM' },
    { actorName: 'Khalid Mansour', actorRole: 'STAFF', action: 'REPLY_MESSAGE',   messageAr: 'تم الرد على رسالة خالد منصور',                       messageEn: 'Replied to message from Khalid Mansour',              entityType: 'Message',      stream: 'TEAM' },
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'CREATE_REFERRAL',   messageAr: 'تم إنشاء رمز إحالة: tiktok',                        messageEn: 'Created referral code: tiktok',                        entityType: 'Referral',     stream: 'TEAM' },
    { actorName: 'Omar Abdullah', actorRole: 'DONOR', action: 'DONATION_PAID',    messageAr: 'تم إتمام التبرع بمبلغ 150 دولار',                   messageEn: 'Donation of $150 completed',                           entityType: 'Donation',     stream: 'DONOR' },
    { actorName: 'Sara Al-Rashid', actorRole: 'STAFF', action: 'UPDATE_SLIDE',    messageAr: 'تم تحديث شرائح الصفحة الرئيسية',                   messageEn: 'Updated homepage slides',                              entityType: 'Slide',        stream: 'TEAM' },
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'DELETE_COMMENT',    messageAr: 'تم حذف تعليق مخالف لسياسة النشر',                   messageEn: 'Deleted comment violating publishing policy',          entityType: 'Comment',      stream: 'TEAM' },
    { actorName: 'Mariam Khalil', actorRole: 'DONOR', action: 'SUBSCRIPTION_CREATED', messageAr: 'تم إنشاء اشتراك شهري بمبلغ 100 دولار',        messageEn: 'Monthly subscription of $100 created',                 entityType: 'Subscription', stream: 'DONOR' },
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'PUBLISH_POST',      messageAr: 'تم نشر مقال: فضل صدقة الجارية في الإسلام',         messageEn: 'Published article: Virtue of Sadaqah Jariyah in Islam', entityType: 'Post',        stream: 'TEAM' },
    { actorName: 'Khalid Mansour', actorRole: 'STAFF', action: 'EXPORT_REPORT',   messageAr: 'تم تصدير تقرير التبرعات الشهري',                    messageEn: 'Exported monthly donations report',                    entityType: null,           stream: 'TEAM' },
    { actorName: 'Hassan Nasser', actorRole: 'DONOR', action: 'DONATION_PAID',     messageAr: 'تم إتمام التبرع بمبلغ 500 دولار',                   messageEn: 'Donation of $500 completed',                           entityType: 'Donation',     stream: 'DONOR' },
    { actorName: 'مدير النظام',  actorRole: 'ADMIN', action: 'CREATE_CAMPAIGN',   messageAr: 'تم إنشاء مشروع: سلة غذاء رمضان',                    messageEn: 'Created campaign: Ramadan Food Basket',                entityType: 'Campaign',     stream: 'TEAM' },
  ];

  for (const log of auditLogsRaw) {
    await prisma.auditLog.create({
      data: {
        actorName: log.actorName,
        actorRole: log.actorRole,
        action: log.action,
        messageAr: log.messageAr,
        messageEn: log.messageEn,
        entityType: log.entityType,
        entityId: null,
        stream: log.stream,
        createdAt: randomDate(monthsAgo(6), daysAgo(1)),
      },
    });
  }
  console.log(`✓ Created ${auditLogsRaw.length} audit logs`);

  // ─────────────────────────────────────────────
  // LIVE DONATION TICKER
  // ─────────────────────────────────────────────
  await prisma.liveDonationTicker.create({
    data: {
      isActive: true,
      donorNames: [
        // Male
        'Ahmed', 'Mohammed', 'Muhammad', 'Mahmoud', 'Mostafa', 'Mustafa',
        'Abdullah', 'Abdelrahman', 'Abdelaziz', 'Omar', 'Umar', 'Ali',
        'Hassan', 'Hussein', 'Hamza', 'Bilal', 'Yusuf', 'Yousef',
        'Ibrahim', 'Ismail', 'Khalid', 'Walid', 'Tariq', 'Ammar',
        'Anas', 'Saad', 'Saeed', 'Salman', 'Faisal', 'Rashid',
        'Nabil', 'Karim', 'Ayman', 'Ilyas', 'Harun', 'Yahya',
        'Jamal', 'Kamal', 'Naser', 'Zubair',
        // Female
        'Fatima', 'Fatimah', 'Aisha', 'Khadija', 'Mariam', 'Maryam',
        'Asma', 'Hafsa', 'Zainab', 'Zaynab', 'Noor', 'Nur',
        'Hanan', 'Huda', 'Iman', 'Amina', 'Salma', 'Yasmin',
        'Layla', 'Nada', 'Aya', 'Malak', 'Marwa', 'Hala',
        'Rania', 'Rana', 'Bushra', 'Rahma', 'Hiba', 'Wafaa',
        'Tasneem', 'Kawthar', 'Ikram', 'Najwa',
      ],
      amountRanges: [
        { minAmount: 5,    maxAmount: 50,   probability: 60, label: 'small'      },
        { minAmount: 51,   maxAmount: 200,  probability: 30, label: 'medium'     },
        { minAmount: 201,  maxAmount: 1000, probability: 8,  label: 'large'      },
        { minAmount: 1001, maxAmount: 5000, probability: 2,  label: 'very_large' },
      ],
      minIntervalSeconds: 3,
      maxIntervalSeconds: 8,
    },
  });
  console.log('✓ Created live donation ticker');

  // ─────────────────────────────────────────────
  // TRACKING SETTINGS  (empty placeholders)
  // ─────────────────────────────────────────────
  await prisma.trackingSettings.create({
    data: {
      facebookPixelId:     null,
      facebookAccessToken: null,
      gaMeasurementId:     null,
      tiktokPixelId:       null,
      xPixelId:            null,
    },
  });
  console.log('✓ Created tracking settings\n');

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
  console.log('🎉 Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   Users           : 1 admin + 2 staff + ${donors.length} donors`);
  console.log(`   Categories      : ${categories.length}`);
  console.log(`   Campaigns       : ${campaigns.length}`);
  console.log(`   Campaign Updates: ${updatesRaw.length}`);
  console.log(`   Referral Codes  : ${referrals.length}`);
  console.log(`   Donations       : 65`);
  console.log(`   Subscriptions   : 12`);
  console.log(`   Comments        : 25`);
  console.log(`   Badges          : ${badgesRaw.length}`);
  console.log(`   Slides          : ${slidesRaw.length}`);
  console.log(`   Post Categories : ${postCategories.length}`);
  console.log(`   Blog Posts      : ${postsRaw.length}`);
  console.log(`   Messages        : ${messagesRaw.length}`);
  console.log(`   Audit Logs      : ${auditLogsRaw.length}`);
  console.log('\n🔑 Admin login: admin@alafiya.org  (OAuth only — sign in with Google/Facebook)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
