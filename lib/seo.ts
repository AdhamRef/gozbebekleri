import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://minberiaksa.org").replace(/\/$/, "");
export const SITE_NAME = "Minber-i Aksa";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const LOCALES = ["ar", "en", "fr", "tr", "id", "pt", "es", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const OG_LOCALE_MAP: Record<Locale, string> = {
  ar: "ar_SA",
  en: "en_US",
  fr: "fr_FR",
  tr: "tr_TR",
  id: "id_ID",
  pt: "pt_BR",
  es: "es_ES",
  de: "de_DE",
};

type LocaleSEO = {
  siteName: string;
  title: string;
  description: string;
  keywords: string[];
  titleTemplate: string;
  campaigns: { title: string; description: string };
  about: { title: string; description: string };
  contact: { title: string; description: string };
  blog: { title: string; description: string };
};

const sharedKeywords = [
  "Minber-i Aksa",
  "Minber Al-Aqsa",
  "Minbar al-Aqsa",
  "Al-Quds donation",
  "Al-Aqsa donation",
  "Gaza donation",
  "Palestine charity",
  "zakat online",
  "waqf donation",
  "sadaqah",
  "Islamic charity",
  "donate online",
  "recurring giving",
  "Palestine relief",
  "secure donation",
];

export const LOCALE_SEO: Record<Locale, LocaleSEO> = {
  ar: {
    siteName: "مؤسسة منبر الأقصى الدولية",
    title: "منبر الأقصى | تبرع آمن للقدس والأقصى وغزة والزكاة والوقف",
    description:
      "منبر الأقصى منصة تبرع موثوقة لدعم القدس والأقصى وغزة ومشاريع الزكاة والوقف والصدقة، مع إيصالات وتحديثات أثر وتقارير ميدانية عند توفرها.",
    keywords: [
      "منبر الأقصى",
      "مؤسسة منبر الأقصى الدولية",
      "تبرع للقدس",
      "تبرع للأقصى",
      "تبرع لغزة",
      "زكاة فلسطين",
      "وقف القدس",
      "صدقة جارية",
      "تبرع آمن",
      "مشاريع خيرية فلسطين",
      "إغاثة غزة",
      "القدس",
      "المسجد الأقصى",
      "منصة تبرع موثوقة",
    ],
    titleTemplate: "%s | منبر الأقصى",
    campaigns: {
      title: "مشاريع التبرع | منبر الأقصى",
      description:
        "استكشف مشاريع منبر الأقصى الرسمية لدعم القدس والأقصى وغزة والزكاة والوقف، وتبرع بأمان مع إمكانية متابعة الأثر والتحديثات.",
    },
    about: {
      title: "من نحن | منبر الأقصى",
      description:
        "تعرف على رسالة منبر الأقصى في خدمة القدس والأقصى وغزة عبر منظومة تبرع موثوقة ومشاريع خيرية واضحة الأثر.",
    },
    contact: {
      title: "تواصل معنا | منبر الأقصى",
      description:
        "تواصل مع فريق منبر الأقصى للاستفسار عن التبرعات، المشاريع، الزكاة، الوقف، الشراكات أو التطوع.",
    },
    blog: {
      title: "المعرفة والتقارير | منبر الأقصى",
      description:
        "مقالات وتقارير وتحديثات توضح أثر التبرعات ومفاهيم الزكاة والوقف ودعم القدس والأقصى وغزة.",
    },
  },

  en: {
    siteName: "Minber-i Aksa International Association",
    title: "Minber-i Aksa | Secure Giving for Al-Quds, Al-Aqsa, Gaza, Zakat and Waqf",
    description:
      "Minber-i Aksa is a trusted donation platform supporting Al-Quds, Al-Aqsa, Gaza, zakat, waqf and sadaqah projects with secure giving, receipts and impact updates when available.",
    keywords: sharedKeywords,
    titleTemplate: "%s | Minber-i Aksa",
    campaigns: {
      title: "Donation Projects | Minber-i Aksa",
      description:
        "Browse official Minber-i Aksa donation projects for Al-Quds, Al-Aqsa, Gaza, zakat and waqf, and give securely with clear campaign information.",
    },
    about: {
      title: "About Us | Minber-i Aksa",
      description:
        "Learn about Minber-i Aksa's mission to support Al-Quds, Al-Aqsa and Gaza through trusted donation infrastructure and transparent charitable projects.",
    },
    contact: {
      title: "Contact | Minber-i Aksa",
      description:
        "Contact Minber-i Aksa for donation, project, zakat, waqf, partnership or volunteer questions.",
    },
    blog: {
      title: "Knowledge and Reports | Minber-i Aksa",
      description:
        "Read donor guides, impact updates and educational content about zakat, waqf, Al-Quds, Al-Aqsa and Gaza support.",
    },
  },

  fr: {
    siteName: "Association Internationale Minber-i Aksa",
    title: "Minber-i Aksa | Dons sécurisés pour Al-Quds, Al-Aqsa, Gaza, Zakat et Waqf",
    description:
      "Minber-i Aksa est une plateforme de dons fiable pour soutenir Al-Quds, Al-Aqsa, Gaza, la zakat, le waqf et la sadaqa, avec paiement sécurisé et suivi d'impact lorsque disponible.",
    keywords: ["Minber-i Aksa", "don Al-Quds", "don Al-Aqsa", "don Gaza", "zakat en ligne", "waqf", "Palestine", "association islamique", "don sécurisé"],
    titleTemplate: "%s | Minber-i Aksa",
    campaigns: {
      title: "Projets de don | Minber-i Aksa",
      description: "Découvrez les projets officiels de Minber-i Aksa pour Al-Quds, Al-Aqsa, Gaza, la zakat et le waqf.",
    },
    about: {
      title: "Qui sommes-nous | Minber-i Aksa",
      description: "Découvrez la mission de Minber-i Aksa pour soutenir Al-Quds, Al-Aqsa et Gaza par des projets de dons fiables.",
    },
    contact: {
      title: "Contact | Minber-i Aksa",
      description: "Contactez Minber-i Aksa pour les dons, projets, zakat, waqf, partenariats ou bénévolat.",
    },
    blog: {
      title: "Connaissances et rapports | Minber-i Aksa",
      description: "Guides, rapports et mises à jour sur la zakat, le waqf, Al-Quds, Al-Aqsa et Gaza.",
    },
  },

  tr: {
    siteName: "Minber-i Aksa Derneği",
    title: "Minber-i Aksa | Kudüs, Mescid-i Aksa, Gazze, Zekat ve Vakıf için Güvenli Bağış",
    description:
      "Minber-i Aksa; Kudüs, Mescid-i Aksa, Gazze, zekat, vakıf ve sadaka projelerini destekleyen güvenilir bağış platformudur. Güvenli ödeme ve mümkün olduğunda etki güncellemeleri sunar.",
    keywords: ["Minber-i Aksa", "Kudüs bağış", "Mescid-i Aksa bağış", "Gazze bağış", "zekat bağışı", "vakıf bağışı", "sadaka", "Filistin yardım", "güvenli bağış"],
    titleTemplate: "%s | Minber-i Aksa",
    campaigns: {
      title: "Bağış Projeleri | Minber-i Aksa",
      description: "Kudüs, Mescid-i Aksa, Gazze, zekat ve vakıf için resmi Minber-i Aksa bağış projelerini inceleyin.",
    },
    about: {
      title: "Hakkımızda | Minber-i Aksa",
      description: "Minber-i Aksa'nın Kudüs, Mescid-i Aksa ve Gazze'ye yönelik güvenilir bağış ve yardım misyonunu keşfedin.",
    },
    contact: {
      title: "İletişim | Minber-i Aksa",
      description: "Bağış, proje, zekat, vakıf, ortaklık veya gönüllülük için Minber-i Aksa ile iletişime geçin.",
    },
    blog: {
      title: "Bilgi Merkezi ve Raporlar | Minber-i Aksa",
      description: "Zekat, vakıf, Kudüs, Mescid-i Aksa ve Gazze desteği hakkında rehberler ve saha güncellemeleri.",
    },
  },

  id: {
    siteName: "Minber-i Aksa International Association",
    title: "Minber-i Aksa | Donasi Aman untuk Al-Quds, Al-Aqsa, Gaza, Zakat dan Waqf",
    description:
      "Minber-i Aksa adalah platform donasi tepercaya untuk mendukung Al-Quds, Al-Aqsa, Gaza, zakat, waqf dan sedekah dengan pembayaran aman dan pembaruan dampak bila tersedia.",
    keywords: ["Minber-i Aksa", "donasi Al-Quds", "donasi Al-Aqsa", "donasi Gaza", "zakat online", "waqf", "Palestina", "donasi aman"],
    titleTemplate: "%s | Minber-i Aksa",
    campaigns: {
      title: "Proyek Donasi | Minber-i Aksa",
      description: "Jelajahi proyek donasi resmi Minber-i Aksa untuk Al-Quds, Al-Aqsa, Gaza, zakat dan waqf.",
    },
    about: {
      title: "Tentang Kami | Minber-i Aksa",
      description: "Pelajari misi Minber-i Aksa untuk mendukung Al-Quds, Al-Aqsa dan Gaza melalui proyek donasi yang tepercaya.",
    },
    contact: {
      title: "Kontak | Minber-i Aksa",
      description: "Hubungi Minber-i Aksa untuk donasi, proyek, zakat, waqf, kemitraan atau relawan.",
    },
    blog: {
      title: "Pusat Pengetahuan dan Laporan | Minber-i Aksa",
      description: "Panduan, laporan dan pembaruan dampak tentang zakat, waqf, Al-Quds, Al-Aqsa dan Gaza.",
    },
  },

  pt: {
    siteName: "Associação Internacional Minber-i Aksa",
    title: "Minber-i Aksa | Doações seguras para Al-Quds, Al-Aqsa, Gaza, Zakat e Waqf",
    description:
      "Minber-i Aksa é uma plataforma de doações confiável para apoiar Al-Quds, Al-Aqsa, Gaza, zakat, waqf e sadaqah com pagamento seguro e atualizações de impacto quando disponíveis.",
    keywords: ["Minber-i Aksa", "doação Al-Quds", "doação Al-Aqsa", "doação Gaza", "zakat online", "waqf", "Palestina", "doação segura"],
    titleTemplate: "%s | Minber-i Aksa",
    campaigns: {
      title: "Projetos de Doação | Minber-i Aksa",
      description: "Explore projetos oficiais da Minber-i Aksa para Al-Quds, Al-Aqsa, Gaza, zakat e waqf.",
    },
    about: {
      title: "Sobre Nós | Minber-i Aksa",
      description: "Conheça a missão da Minber-i Aksa para apoiar Al-Quds, Al-Aqsa e Gaza por meio de projetos de doação confiáveis.",
    },
    contact: {
      title: "Contato | Minber-i Aksa",
      description: "Entre em contato com a Minber-i Aksa para dúvidas sobre doações, projetos, zakat, waqf, parcerias ou voluntariado.",
    },
    blog: {
      title: "Conhecimento e Relatórios | Minber-i Aksa",
      description: "Guias, relatórios e atualizações sobre zakat, waqf, Al-Quds, Al-Aqsa e Gaza.",
    },
  },

  es: {
    siteName: "Asociación Internacional Minber-i Aksa",
    title: "Minber-i Aksa | Donaciones seguras para Al-Quds, Al-Aqsa, Gaza, Zakat y Waqf",
    description:
      "Minber-i Aksa es una plataforma de donación confiable para apoyar Al-Quds, Al-Aqsa, Gaza, zakat, waqf y sadaqah con pagos seguros y actualizaciones de impacto cuando estén disponibles.",
    keywords: ["Minber-i Aksa", "donación Al-Quds", "donación Al-Aqsa", "donación Gaza", "zakat online", "waqf", "Palestina", "donación segura"],
    titleTemplate: "%s | Minber-i Aksa",
    campaigns: {
      title: "Proyectos de Donación | Minber-i Aksa",
      description: "Explora proyectos oficiales de Minber-i Aksa para Al-Quds, Al-Aqsa, Gaza, zakat y waqf.",
    },
    about: {
      title: "Quiénes Somos | Minber-i Aksa",
      description: "Conoce la misión de Minber-i Aksa para apoyar Al-Quds, Al-Aqsa y Gaza mediante proyectos de donación confiables.",
    },
    contact: {
      title: "Contacto | Minber-i Aksa",
      description: "Contacta con Minber-i Aksa para donaciones, proyectos, zakat, waqf, alianzas o voluntariado.",
    },
    blog: {
      title: "Conocimiento e Informes | Minber-i Aksa",
      description: "Guías, informes y actualizaciones sobre zakat, waqf, Al-Quds, Al-Aqsa y Gaza.",
    },
  },

  de: {
    siteName: "Minber-i Aksa Internationale Vereinigung",
    title: "Minber-i Aksa | Sichere Spenden für Al-Quds, Al-Aqsa, Gaza, Zakat und Waqf",
    description:
      "Minber-i Aksa ist eine vertrauenswürdige Spendenplattform zur Unterstützung von Al-Quds, Al-Aqsa, Gaza, Zakat, Waqf und Sadaqah mit sicherer Zahlung und verfügbaren Wirkungsupdates.",
    keywords: ["Minber-i Aksa", "Al-Quds Spende", "Al-Aqsa Spende", "Gaza Spende", "Zakat online", "Waqf", "Palästina", "sichere Spende"],
    titleTemplate: "%s | Minber-i Aksa",
    campaigns: {
      title: "Spendenprojekte | Minber-i Aksa",
      description: "Entdecke offizielle Minber-i Aksa Spendenprojekte für Al-Quds, Al-Aqsa, Gaza, Zakat und Waqf.",
    },
    about: {
      title: "Über Uns | Minber-i Aksa",
      description: "Erfahre mehr über die Mission von Minber-i Aksa, Al-Quds, Al-Aqsa und Gaza durch vertrauenswürdige Spendenprojekte zu unterstützen.",
    },
    contact: {
      title: "Kontakt | Minber-i Aksa",
      description: "Kontaktiere Minber-i Aksa für Fragen zu Spenden, Projekten, Zakat, Waqf, Partnerschaften oder Freiwilligenarbeit.",
    },
    blog: {
      title: "Wissen und Berichte | Minber-i Aksa",
      description: "Leitfäden, Berichte und Updates zu Zakat, Waqf, Al-Quds, Al-Aqsa und Gaza.",
    },
  },
};

/** Build hreflang alternates for a given path (e.g. "/campaigns") */
export function buildHreflang(path: string, currentLocale: string) {
  const normalizedPath = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${normalizedPath}`;
  }
  languages["x-default"] = `${SITE_URL}/ar${normalizedPath}`;
  return {
    canonical: `${SITE_URL}/${currentLocale}${normalizedPath}`,
    languages,
  };
}

/**
 * Build hreflang/canonical alternates for a slug-routed entity (campaign, post,
 * category) where each locale may have its OWN translation slug.
 */
export function buildLocalizedAlternates(args: {
  /** URL prefix without trailing slash, e.g. "/campaign", "/blog", "/category" */
  basePath: string;
  /** Default-locale (Arabic) slug from the entity row */
  baseSlug?: string | null;
  /** Per-locale translation rows; only `locale` and optional `slug` are used */
  translations?: Array<{ locale: string; slug?: string | null }> | null;
  /** Used when neither a translation slug nor base slug is set (typically the entity id) */
  fallback: string;
  /** Locale of the page we're rendering — drives `canonical` */
  currentLocale: string;
}): { canonical: string; languages: Record<string, string> } {
  const { basePath, baseSlug, translations, fallback, currentLocale } = args;
  const slugFor = (loc: string): string => {
    const t = translations?.find((tt) => tt.locale === loc && tt.slug);
    return t?.slug || baseSlug || fallback;
  };
  const url = (loc: string): string =>
    `${SITE_URL}/${loc}${basePath}/${encodeURIComponent(slugFor(loc))}`;

  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = url(locale);
  languages["x-default"] = url("ar");
  return { canonical: url(currentLocale), languages };
}

/** Build full per-page metadata (layout/page generateMetadata helper) */
export function buildPageMetadata(
  locale: string,
  overrides: {
    title: string;
    description: string;
    path: string;
    image?: string;
    keywords?: string[];
    type?: "website" | "article";
  }
): Metadata {
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  const image = overrides.image ?? OG_IMAGE;
  const alternates = buildHreflang(overrides.path, locale);

  return {
    title: overrides.title,
    description: overrides.description,
    keywords: overrides.keywords ?? seo.keywords,
    alternates,
    openGraph: {
      title: overrides.title,
      description: overrides.description,
      url: alternates.canonical,
      siteName: seo.siteName,
      locale: OG_LOCALE_MAP[locale as Locale] ?? "en_US",
      type: overrides.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: overrides.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: overrides.title,
      description: overrides.description,
      images: [image],
    },
  };
}
