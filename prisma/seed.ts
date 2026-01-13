const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete existing campaigns (optional, for clean seeding)
  //await prisma.campaign.deleteMany();

  // Campaign data for each category
  const campaigns = [
    // Category: عمليات طارئة (Emergency Operations)
    {
      title: "إنقاذ شاب مصاب بطلق ناري في حمص",
      description: "شاب يبلغ من العمر 18 عامًا أصيب بطلق ناري في منطقة الصدر خلال اشتباكات في حمص. يحتاج إلى عملية جراحية عاجلة لإزالة الرصاصة وإصلاح الأضرار التي لحقت بأعضاءه الحيوية. التكلفة المتوقعة للعملية والمتابعة الطبية هي 6000 دولار. هذا الشاب هو المعيل الوحيد لعائلته، وإنقاذ حياته يعني إنقاذ مستقبل عائلته بأكملها.",
      targetAmount: 6000,
      images: [
        "https://example.com/images/gunshot_homs.jpg",
        "https://example.com/images/surgery_homs.jpg",
      ],
      videoUrl: "https://example.com/videos/gunshot_homs.mp4",
      categoryId: "67abb1a13a08798ac4bc935e", // عمليات طارئة
    },

    // Category: علاج وأدوية (Treatment and Medicines)
    {
      title: "توفير أدوية لمرضى القلب في درعا",
      description: "توفير الأدوية الأساسية لـ 15 مريضًا يعانون من أمراض القلب في درعا. تكلفة الأدوية لكل مريض تصل إلى 300 دولار شهريًا. الحملة تهدف إلى جمع 13500 دولار لتغطية تكاليف 3 أشهر من العلاج. هؤلاء المرضى يعتمدون على هذه الأدوية للبقاء على قيد الحياة، وتوفيرها يعني منحهم فرصة للعيش بصحة أفضل.",
      targetAmount: 13500,
      images: [
        "https://example.com/images/heart_daraa.jpg",
        "https://example.com/images/medicine_daraa.jpg",
      ],
      videoUrl: "https://example.com/videos/heart_daraa.mp4",
      categoryId: "67abb1a23a08798ac4bc935f", // علاج وأدوية
    },

    // Category: إعادة تأهيل وعلاج طبيعي (Rehabilitation and Physical Therapy)
    {
      title: "إعادة تأهيل طفل مصاب بحروق في حلب",
      description: "طفل يبلغ من العمر 10 سنوات أصيب بحروق شديدة بسبب انفجار قنبلة في حلب. يحتاج إلى جلسات علاج طبيعي مكثفة لاستعادة حركة أطرافه وتقليل الآلام. تكلفة العلاج تصل إلى 4000 دولار. هذا الطفل يحتاج إلى دعم نفسي وجسدي لاستعادة حياته الطبيعية، وتوفير العلاج له يعني منحه فرصة للتعافي.",
      targetAmount: 4000,
      images: [
        "https://example.com/images/burns_aleppo.jpg",
        "https://example.com/images/pt_aleppo.jpg",
      ],
      videoUrl: "https://example.com/videos/burns_aleppo.mp4",
      categoryId: "67abb1a23a08798ac4bc9360", // إعادة تأهيل وعلاج طبيعي
    },

    // Category: رعاية حديثي الولادة (Newborn Care)
    {
      title: "إنقاذ توأم خديج في إدلب",
      description: "توأم خديج ولد قبل الأوان في إدلب ويحتاج إلى حاضنات حديثي الولادة وأدوية خاصة. تكلفة الرعاية تصل إلى 8000 دولار. الحملة تهدف إلى جمع المبلغ لإنقاذ حياة التوأم. هذان الطفلان هما الأمل الوحيد لعائلتهما، وتوفير الرعاية لهما يعني إنقاذ مستقبلهما.",
      targetAmount: 8000,
      images: [
        "https://example.com/images/twins_idlib.jpg",
        "https://example.com/images/incubator_idlib.jpg",
      ],
      videoUrl: "https://example.com/videos/twins_idlib.mp4",
      categoryId: "67abb1a33a08798ac4bc9361", // رعاية حديثي الولادة
    },

    // Category: إنشاء المستشفيات (Hospital Construction)
    {
      title: "بناء مركز طبي في ريف درعا",
      description: "بناء مركز طبي في ريف درعا لتقديم الرعاية الصحية الأساسية للنازحين. التكلفة المتوقعة للمشروع تصل إلى 45000 دولار. هذا المركز سيكون نقطة إنقاذ للعديد من الأشخاص الذين يعانون من نقص الخدمات الطبية في المنطقة.",
      targetAmount: 45000,
      images: [
        "https://example.com/images/clinic_daraa.jpg",
        "https://example.com/images/construction_daraa.jpg",
      ],
      videoUrl: "https://example.com/videos/clinic_daraa.mp4",
      categoryId: "67abb1a33a08798ac4bc9362", // إنشاء المستشفيات
    },
  ];

  // Create campaigns
  for (const campaign of campaigns) {
    await prisma.campaign.create({
      data: campaign,
    });
  }

  console.log("Campaigns seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });