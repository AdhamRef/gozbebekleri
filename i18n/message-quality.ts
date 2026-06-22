type MessageValue = string | number | boolean | null | MessageObject | MessageValue[];
export type MessageObject = { [key: string]: MessageValue };

type LocaleMessages = Record<string, MessageObject>;
type CorrectionMap = Record<string, MessageValue>;

const EMPTY_TEXT_RE = /^\s*$/;

function isObject(value: unknown): value is MessageObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneValue<T extends MessageValue>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T;
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneValue(v)])) as T;
  return value;
}

function pathGet(obj: MessageObject, path: string): MessageValue | undefined {
  const parts = path.split(".");
  let current: MessageValue | undefined = obj;
  for (const part of parts) {
    if (!isObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

function pathSet(obj: MessageObject, path: string, value: MessageValue) {
  const parts = path.split(".");
  let current: MessageObject = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!isObject(current[key])) current[key] = {};
    current = current[key] as MessageObject;
  }
  current[parts[parts.length - 1]] = cloneValue(value);
}

function mergeMissing(base: MessageValue, fallback: MessageValue): MessageValue {
  if (typeof base === "string") {
    if (!EMPTY_TEXT_RE.test(base)) return base;
    return typeof fallback === "string" ? fallback : base;
  }
  if (base == null) return cloneValue(fallback);
  if (Array.isArray(base)) {
    if (base.length > 0) return base.map((item, idx) => mergeMissing(item, Array.isArray(fallback) ? fallback[idx] : undefined));
    return Array.isArray(fallback) ? cloneValue(fallback) : base;
  }
  if (isObject(base) && isObject(fallback)) {
    const out: MessageObject = { ...base };
    for (const [key, fallbackValue] of Object.entries(fallback)) {
      out[key] = key in out ? mergeMissing(out[key], fallbackValue) : cloneValue(fallbackValue);
    }
    return out;
  }
  return base;
}

function applyCorrections(messages: MessageObject, corrections: CorrectionMap): MessageObject {
  const out = cloneValue(messages);
  for (const [path, value] of Object.entries(corrections)) {
    pathSet(out, path, value);
  }
  return out;
}

const AR_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "تبرع الآن",
  "Navbar.donateNow": "تبرع الآن",
  "Navbar.projects": "المشاريع",
  "Navbar.news": "المعرفة",
  "Navbar.events": "الأنشطة والتحديثات",
  "Navbar.programs": "مسارات العطاء",
  "Navbar.about": "من نحن",
  "Navbar.contact": "تواصل معنا",
  "Navbar.bankAccounts": "الحسابات البنكية",
  "HomePage.featuredProjects": "مشاريع منبر الأقصى",
  "HomePage.currentProjects": "مشاريع جارية",
  "HomePage.donationCategories": "مسارات العطاء",
  "HomePage.newsSubtitle": "تحديثات وتقارير منبر الأقصى",
  "HomePage.latestNews": "المعرفة والتقارير",
  "HomePage.communityImpact": "أثر العطاء",
  "HomePage.weHelp": "ندعم القدس والأقصى وغزة",
  "QuickDonate.associationName": "منبر الأقصى",
  "QuickDonate.description": "اختر نية عطائك وادعم مشاريع القدس والأقصى وغزة والزكاة والوقف بأمان.",
  "QuickDonate.monthlyCommitment": "فعّل التبرع الدوري",
  "QuickDonate.monthlyCommitmentDesc": "اجعل عطائك مستمرًا عبر تبرع يومي أو أسبوعي أو شهري.",
  "QuickDonate.selectProject": "اختر المشروع أو المسار",
  "QuickDonate.selectAmount": "اختر المبلغ",
  "QuickDonate.customAmount": "أو أدخل مبلغًا مخصصًا",
  "QuickDonate.donateNow": "تبرع بأمان",
  "QuickDonate.secureTransactions": "دفع آمن · إيصال · تحديثات أثر عند توفرها",
  "QuickDonate.feature1": "مشاريع رسمية واضحة",
  "QuickDonate.feature2": "إيصالات وتحديثات أثر",
  "QuickDonate.feature3": "زكاة ووقف وصدقة",
  "QuickDonate.feature4": "تجربة تبرع متعددة اللغات",
  "Footer.description": "منبر الأقصى منصة تبرع موثوقة لدعم القدس والأقصى وغزة ومشاريع الزكاة والوقف والصدقة.",
  "Footer.aboutUsDesc1": "منبر الأقصى منصة عطاء رسمية للقدس والأقصى وغزة.",
  "Footer.copyright": "© {year} منبر الأقصى. جميع الحقوق محفوظة.",
  "Campaign.campaignStats": "إحصائيات المشروع",
  "Campaign.notFound": "المشروع غير موجود",
  "Campaign.campaignNotFound": "المشروع غير موجود",
  "Campaign.donateNow": "تبرع الآن",
  "Campaign.share": "شارك المشروع",
  "DonationDialog.chooseDonationTypeDesc": "اختر تبرعًا لمرة واحدة أو تبرعًا دوريًا.",
  "DonationDialog.oneTimeDonationDesc": "تبرع لمرة واحدة لهذا المشروع.",
  "DonationDialog.monthlyDonationDesc": "ادعم هذا المشروع بتبرع دوري.",
  "DonationSuccess.thankYou": "جزاك الله خيرًا",
  "DonationSuccess.campaignsAndCategoriesDonatedTo": "المشاريع ومسارات العطاء التي دعمتها",
};

const EN_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "Donate Now",
  "Navbar.donateNow": "Donate Now",
  "Navbar.projects": "Projects",
  "Navbar.news": "Knowledge",
  "Navbar.events": "Updates",
  "Navbar.programs": "Giving Paths",
  "Navbar.about": "About",
  "Navbar.contact": "Contact",
  "Navbar.bankAccounts": "Bank Accounts",
  "HomePage.featuredProjects": "Minber Projects",
  "HomePage.currentProjects": "Current Projects",
  "HomePage.donationCategories": "Giving Paths",
  "HomePage.newsSubtitle": "Minber-i Aksa updates and reports",
  "HomePage.latestNews": "Knowledge and Reports",
  "HomePage.communityImpact": "Impact of Giving",
  "HomePage.weHelp": "We support Al-Quds, Al-Aqsa and Gaza",
  "QuickDonate.associationName": "Minber-i Aksa",
  "QuickDonate.description": "Choose your giving intention and support Al-Quds, Al-Aqsa, Gaza, zakat and waqf projects securely.",
  "QuickDonate.monthlyCommitment": "Activate Recurring Giving",
  "QuickDonate.monthlyCommitmentDesc": "Make your giving continuous through daily, weekly or monthly support.",
  "QuickDonate.selectProject": "Select a project or giving path",
  "QuickDonate.selectAmount": "Select amount",
  "QuickDonate.customAmount": "Or enter a custom amount",
  "QuickDonate.donateNow": "Donate Securely",
  "QuickDonate.secureTransactions": "Secure payment · Receipt · Impact updates when available",
  "QuickDonate.feature1": "Official clear projects",
  "QuickDonate.feature2": "Receipts and impact updates",
  "QuickDonate.feature3": "Zakat, waqf and sadaqah",
  "QuickDonate.feature4": "Multilingual donation experience",
  "Footer.description": "Minber-i Aksa is a trusted donation platform supporting Al-Quds, Al-Aqsa, Gaza, zakat, waqf and sadaqah projects.",
  "Footer.aboutUsDesc1": "Minber-i Aksa is an official giving platform for Al-Quds, Al-Aqsa and Gaza.",
  "Footer.copyright": "© {year} Minber-i Aksa. All rights reserved.",
  "Campaign.campaignStats": "Project Statistics",
  "Campaign.notFound": "Project not found",
  "Campaign.campaignNotFound": "Project Not Found",
  "Campaign.donateNow": "Donate Now",
  "Campaign.share": "Share",
  "DonationDialog.chooseDonationTypeDesc": "Choose a one-time or recurring donation.",
  "DonationDialog.oneTimeDonationDesc": "Make a one-time donation to this project.",
  "DonationDialog.monthlyDonationDesc": "Support this project with a recurring donation.",
  "DonationDialog.hadithQuote": "A reminder from the Sunnah",
  "DonationDialog.confirmationDesc": "Review your donation securely",
  "DonationSuccess.thankYou": "Thank you",
  "DonationSuccess.campaignsAndCategoriesDonatedTo": "Projects and Giving Paths You Supported",
};

const TR_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "Şimdi Bağış Yap",
  "Navbar.donateNow": "Şimdi Bağış Yap",
  "Navbar.projects": "Projeler",
  "Navbar.news": "Bilgi Merkezi",
  "Navbar.events": "Güncellemeler",
  "Navbar.programs": "Bağış Alanları",
  "Navbar.about": "Hakkımızda",
  "Navbar.contact": "İletişim",
  "Navbar.bankAccounts": "Banka Hesapları",
  "HomePage.featuredProjects": "Minber Projeleri",
  "HomePage.currentProjects": "Güncel Projeler",
  "HomePage.donationCategories": "Bağış Alanları",
  "HomePage.newsSubtitle": "Minber-i Aksa güncellemeleri ve raporları",
  "QuickDonate.associationName": "Minber-i Aksa",
  "QuickDonate.description": "Bağış niyetinizi seçin; Kudüs, Mescid-i Aksa, Gazze, zekat ve vakıf projelerini güvenle destekleyin.",
  "QuickDonate.monthlyCommitment": "Düzenli Bağışı Başlat",
  "QuickDonate.donateNow": "Güvenle Bağış Yap",
  "QuickDonate.secureTransactions": "Güvenli ödeme · Makbuz · Uygunsa etki güncellemeleri",
  "Footer.description": "Minber-i Aksa; Kudüs, Mescid-i Aksa, Gazze, zekat, vakıf ve sadaka projelerini destekleyen güvenilir bağış platformudur.",
  "Footer.aboutUsDesc1": "Minber-i Aksa, Kudüs, Mescid-i Aksa ve Gazze için resmi bağış platformudur.",
  "Footer.copyright": "© {year} Minber-i Aksa. Tüm hakları saklıdır.",
  "Campaign.campaignStats": "Proje İstatistikleri",
  "Campaign.notFound": "Proje bulunamadı",
  "Campaign.campaignNotFound": "Proje bulunamadı",
  "DonationDialog.confirmDonation": "Bağışı Onayla",
  "DonationDialog.donationFailed": "Bağış başarısız oldu",
  "DonationSuccess.thankYou": "Çok teşekkür ederiz",
};

const FR_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "Faire un don",
  "Navbar.donateNow": "Faire un don",
  "Navbar.projects": "Projets",
  "Navbar.news": "Connaissances",
  "Navbar.about": "Qui sommes-nous ?",
  "Navbar.contact": "Contact",
  "HomePage.featuredProjects": "Projets Minber",
  "HomePage.currentProjects": "Projets en cours",
  "QuickDonate.associationName": "Minber-i Aksa",
  "QuickDonate.description": "Soutenez Al-Quds, Al-Aqsa, Gaza, la zakat et le waqf en toute sécurité.",
  "Footer.description": "Minber-i Aksa est une plateforme de don fiable pour Al-Quds, Al-Aqsa, Gaza, zakat, waqf et sadaqah.",
  "Footer.copyright": "© {year} Minber-i Aksa. Tous droits réservés.",
  "Campaign.campaignStats": "Statistiques du projet",
  "Campaign.notFound": "Projet introuvable",
  "Campaign.campaignNotFound": "Projet introuvable",
};

const ID_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "Donasi Sekarang",
  "Navbar.donateNow": "Donasi Sekarang",
  "Navbar.projects": "Proyek",
  "Navbar.news": "Pengetahuan",
  "Navbar.about": "Tentang Kami",
  "Navbar.contact": "Kontak",
  "HomePage.featuredProjects": "Proyek Minber",
  "HomePage.currentProjects": "Proyek Saat Ini",
  "QuickDonate.associationName": "Minber-i Aksa",
  "Footer.description": "Minber-i Aksa adalah platform donasi tepercaya untuk Al-Quds, Al-Aqsa, Gaza, zakat, waqf dan sedekah.",
  "Footer.copyright": "© {year} Minber-i Aksa. Semua hak dilindungi.",
};

const PT_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "Doar agora",
  "Navbar.donateNow": "Doar agora",
  "Navbar.projects": "Projetos",
  "Navbar.news": "Conhecimento",
  "Navbar.about": "Sobre nós",
  "Navbar.contact": "Contato",
  "HomePage.featuredProjects": "Projetos Minber",
  "HomePage.currentProjects": "Projetos atuais",
  "QuickDonate.associationName": "Minber-i Aksa",
  "Footer.description": "Minber-i Aksa é uma plataforma de doações confiável para Al-Quds, Al-Aqsa, Gaza, zakat, waqf e sadaqah.",
  "Footer.copyright": "© {year} Minber-i Aksa. Todos os direitos reservados.",
};

const ES_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "Donar ahora",
  "Navbar.donateNow": "Donar ahora",
  "Navbar.projects": "Proyectos",
  "Navbar.news": "Conocimiento",
  "Navbar.about": "Quiénes somos",
  "Navbar.contact": "Contacto",
  "HomePage.featuredProjects": "Proyectos Minber",
  "HomePage.currentProjects": "Proyectos actuales",
  "QuickDonate.associationName": "Minber-i Aksa",
  "Footer.description": "Minber-i Aksa es una plataforma de donación confiable para Al-Quds, Al-Aqsa, Gaza, zakat, waqf y sadaqah.",
  "Footer.copyright": "© {year} Minber-i Aksa. Todos los derechos reservados.",
};

const DE_CORRECTIONS: CorrectionMap = {
  "Navbar.donate": "Jetzt spenden",
  "Navbar.donateNow": "Jetzt spenden",
  "Navbar.projects": "Projekte",
  "Navbar.news": "Wissen",
  "Navbar.about": "Über uns",
  "Navbar.contact": "Kontakt",
  "Navbar.bankAccounts": "Bankkonten",
  "HomePage.featuredProjects": "Minber-Projekte",
  "HomePage.currentProjects": "Aktuelle Projekte",
  "HomePage.donationCategories": "Spendenbereiche",
  "QuickDonate.associationName": "Minber-i Aksa",
  "QuickDonate.description": "Unterstütze Al-Quds, Al-Aqsa, Gaza, Zakat und Waqf sicher über Minber-i Aksa.",
  "QuickDonate.monthlyCommitment": "Regelmäßige Spende aktivieren",
  "QuickDonate.donateNow": "Sicher spenden",
  "Footer.description": "Minber-i Aksa ist eine vertrauenswürdige Spendenplattform für Al-Quds, Al-Aqsa, Gaza, Zakat, Waqf und Sadaqah.",
  "Footer.aboutUsDesc1": "Minber-i Aksa ist eine offizielle Spendenplattform für Al-Quds, Al-Aqsa und Gaza.",
  "Footer.copyright": "© {year} Minber-i Aksa. Alle Rechte vorbehalten.",
  "Campaign.campaignStats": "Projektstatistiken",
  "Campaign.notFound": "Projekt nicht gefunden",
  "Campaign.campaignNotFound": "Projekt nicht gefunden",
  "DonationDialog.confirmDonation": "Spende bestätigen",
  "DonationDialog.donationFailed": "Spende fehlgeschlagen",
  "DonationSuccess.thankYou": "Vielen Dank",
};

const CORRECTIONS_BY_LOCALE: Record<string, CorrectionMap> = {
  ar: AR_CORRECTIONS,
  en: EN_CORRECTIONS,
  tr: TR_CORRECTIONS,
  fr: FR_CORRECTIONS,
  id: ID_CORRECTIONS,
  pt: PT_CORRECTIONS,
  es: ES_CORRECTIONS,
  de: DE_CORRECTIONS,
};

export function normalizeLocaleMessages(locale: string, messages: MessageObject, fallbackMessages: MessageObject): MessageObject {
  const merged = mergeMissing(messages, fallbackMessages) as MessageObject;
  return applyCorrections(merged, CORRECTIONS_BY_LOCALE[locale] ?? {});
}

export function buildNormalizedMessages(allMessages: LocaleMessages, fallbackLocale = "en"): LocaleMessages {
  const fallback = allMessages[fallbackLocale] ?? Object.values(allMessages)[0] ?? {};
  return Object.fromEntries(
    Object.entries(allMessages).map(([locale, messages]) => [
      locale,
      normalizeLocaleMessages(locale, messages, fallback),
    ])
  );
}

export function getMessageByPath(messages: MessageObject, path: string): MessageValue | undefined {
  return pathGet(messages, path);
}
