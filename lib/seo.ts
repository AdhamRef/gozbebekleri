import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://gozbebekleri.com").replace(/\/$/, "");
export const SITE_NAME = "Gözbebekleri";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const LOCALES = ["ar", "en", "fr", "tr", "id", "pt", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const OG_LOCALE_MAP: Record<Locale, string> = {
  ar: "ar_SA",
  en: "en_US",
  fr: "fr_FR",
  tr: "tr_TR",
  id: "id_ID",
  pt: "pt_BR",
  es: "es_ES",
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

export const LOCALE_SEO: Record<Locale, LocaleSEO> = {
  ar: {
    siteName: "جمعية قرة العيون للإغاثة والتكافل",
    title: "قرة العيون | تبرع للمرضى السوريين – زكاة، صدقة، إغاثة إنسانية",
    description: "ساعد في إنقاذ الأرواح في سوريا — تبرع لعمليات طبية عاجلة ومساعدات إنسانية عبر منصة قرة العيون الموثوقة. زكاتك وصدقتك تصل مباشرةً.",
    keywords: ["تبرع سوريا", "مساعدة طبية سوريا", "جمعية خيرية", "تبرع عملية طبية", "إغاثة إنسانية", "زكاة المال", "صدقة جارية", "تكفل مريض", "تبرع طارئ", "قرة العيون", "مساعدة السوريين", "عمليات قلب سوريا", "أطفال سوريا"],
    titleTemplate: "%s | قرة العيون",
    campaigns: {
      title: "حملات التبرع | قرة العيون – أنقذ حياة في سوريا",
      description: "استعرض حملات التبرع الطبية والإنسانية الفعّالة. تبرعك يموّل عمليات عاجلة وعلاجات حيوية للمرضى السوريين.",
    },
    about: {
      title: "من نحن | جمعية قرة العيون للإغاثة والتكافل",
      description: "جمعية قرة العيون منظمة إنسانية موثوقة تُعنى بالإغاثة الطبية في سوريا. تعرّف على رسالتنا وقيمنا وفريقنا.",
    },
    contact: {
      title: "تواصل معنا | قرة العيون",
      description: "هل لديك سؤال أو تريد التبرع؟ تواصل مع فريق قرة العيون وسنرد عليك في أقرب وقت.",
    },
    blog: {
      title: "أخبار وتقارير | قرة العيون",
      description: "آخر الأخبار والتقارير حول المشاريع الإنسانية والطبية في سوريا من منصة قرة العيون.",
    },
  },
  en: {
    siteName: "Gözbebekleri Charity",
    title: "Gözbebekleri | Donate for Syrian Medical Aid – Zakat, Sadaqah, Urgent Relief",
    description: "Save lives in Syria — fund urgent surgeries, medical treatments, and humanitarian aid. Your zakat and sadaqah go directly to those who need it most. Trusted since 2015.",
    keywords: ["donate to Syria", "Syrian medical aid", "charity donation", "urgent surgery donation", "humanitarian relief Syria", "zakat donation", "sadaqah online", "sponsor Syrian patient", "emergency medical aid", "nonprofit donations Syria", "Syrian refugees help", "heart surgery donation"],
    titleTemplate: "%s | Gözbebekleri",
    campaigns: {
      title: "Donation Campaigns | Gözbebekleri – Save Lives in Syria",
      description: "Browse active medical and humanitarian donation campaigns. Your donation funds urgent surgeries and life-saving treatments for Syrian patients.",
    },
    about: {
      title: "About Us | Gözbebekleri Humanitarian Charity",
      description: "Gözbebekleri is a trusted humanitarian charity focused on medical relief in Syria. Learn about our mission, values, and impact.",
    },
    contact: {
      title: "Contact Us | Gözbebekleri",
      description: "Have a question or want to donate? Reach out to the Gözbebekleri team and we'll get back to you promptly.",
    },
    blog: {
      title: "News & Reports | Gözbebekleri",
      description: "Latest news and field reports from Gözbebekleri's humanitarian and medical projects in Syria.",
    },
  },
  fr: {
    siteName: "Gözbebekleri – Aide Humanitaire",
    title: "Gözbebekleri | Don pour l'Aide Médicale en Syrie – Zakat & Sadaqa",
    description: "Sauvez des vies en Syrie — financez des chirurgies d'urgence, des traitements médicaux et une aide humanitaire. Votre zakat est versée directement aux bénéficiaires.",
    keywords: ["don Syrie", "aide médicale Syrie", "association caritative", "don chirurgie urgence", "aide humanitaire Syrie", "zakat en ligne", "sadaqa", "parrainage patient syrien", "don d'urgence", "ONG humanitaire", "réfugiés syriens aide"],
    titleTemplate: "%s | Gözbebekleri",
    campaigns: {
      title: "Campagnes de Don | Gözbebekleri – Sauvez des Vies en Syrie",
      description: "Parcourez les campagnes de dons médicaux et humanitaires actives. Votre don finance des chirurgies urgentes pour des patients syriens.",
    },
    about: {
      title: "Qui Sommes-Nous | Gözbebekleri Organisation Humanitaire",
      description: "Gözbebekleri est une organisation humanitaire de confiance axée sur l'aide médicale en Syrie. Découvrez notre mission et notre impact.",
    },
    contact: {
      title: "Contactez-Nous | Gözbebekleri",
      description: "Une question ou souhaitez faire un don ? Contactez l'équipe Gözbebekleri et nous vous répondrons rapidement.",
    },
    blog: {
      title: "Actualités et Rapports | Gözbebekleri",
      description: "Dernières nouvelles et rapports de terrain des projets humanitaires et médicaux de Gözbebekleri en Syrie.",
    },
  },
  tr: {
    siteName: "Gözbebekleri Derneği",
    title: "Gözbebekleri | Suriye Tıbbi Yardım için Bağış – Zekat & Sadaka",
    description: "Suriye'de hayat kurtarın — acil ameliyatlar, tıbbi tedaviler ve insani yardım için bağış yapın. Zekatınız ve sadakanız doğrudan ihtiyaç sahiplerine ulaşır.",
    keywords: ["Suriye bağış", "Suriye tıbbi yardım", "hayır derneği", "acil ameliyat bağışı", "insani yardım Suriye", "zekat online", "sadaka", "Suriyeli hasta sponsoru", "acil yardım", "STK bağış", "Suriyeli mülteciler yardım", "Gözbebekleri bağış"],
    titleTemplate: "%s | Gözbebekleri",
    campaigns: {
      title: "Bağış Kampanyaları | Gözbebekleri – Suriye'de Hayat Kurtarın",
      description: "Aktif tıbbi ve insani yardım bağış kampanyalarına göz atın. Bağışınız Suriyeli hastalar için acil ameliyatları finanse eder.",
    },
    about: {
      title: "Hakkımızda | Gözbebekleri İnsani Yardım Derneği",
      description: "Gözbebekleri, Suriye'deki tıbbi yardıma odaklanan güvenilir bir insani yardım derneğidir. Misyonumuzu ve etkimizi öğrenin.",
    },
    contact: {
      title: "İletişim | Gözbebekleri",
      description: "Sorunuz mu var veya bağış yapmak mı istiyorsunuz? Gözbebekleri ekibiyle iletişime geçin, en kısa sürede yanıt vereceğiz.",
    },
    blog: {
      title: "Haberler ve Raporlar | Gözbebekleri",
      description: "Gözbebekleri'nin Suriye'deki insani ve tıbbi projelerine ilişkin son haberler ve saha raporları.",
    },
  },
  id: {
    siteName: "Gözbebekleri – Donasi Kemanusiaan",
    title: "Gözbebekleri | Donasi Bantuan Medis Suriah – Zakat & Sedekah",
    description: "Selamatkan nyawa di Suriah — donasi untuk operasi darurat, perawatan medis, dan bantuan kemanusiaan. Zakat dan sedekah Anda langsung sampai kepada yang membutuhkan.",
    keywords: ["donasi Suriah", "bantuan medis Suriah", "yayasan amal", "donasi operasi darurat", "bantuan kemanusiaan Suriah", "zakat online", "sedekah", "sponsor pasien Suriah", "bantuan darurat", "NGO kemanusiaan", "pengungsi Suriah bantuan"],
    titleTemplate: "%s | Gözbebekleri",
    campaigns: {
      title: "Kampanye Donasi | Gözbebekleri – Selamatkan Nyawa di Suriah",
      description: "Jelajahi kampanye donasi medis dan kemanusiaan yang aktif. Donasi Anda membiayai operasi darurat untuk pasien Suriah.",
    },
    about: {
      title: "Tentang Kami | Gözbebekleri Organisasi Kemanusiaan",
      description: "Gözbebekleri adalah lembaga kemanusiaan terpercaya yang berfokus pada bantuan medis di Suriah. Pelajari misi dan dampak kami.",
    },
    contact: {
      title: "Hubungi Kami | Gözbebekleri",
      description: "Punya pertanyaan atau ingin berdonasi? Hubungi tim Gözbebekleri dan kami akan segera merespons Anda.",
    },
    blog: {
      title: "Berita & Laporan | Gözbebekleri",
      description: "Berita terkini dan laporan lapangan dari proyek kemanusiaan dan medis Gözbebekleri di Suriah.",
    },
  },
  pt: {
    siteName: "Gözbebekleri – Doação Humanitária",
    title: "Gözbebekleri | Doe para Ajuda Médica na Síria – Zakat & Sadaqa",
    description: "Salve vidas na Síria — financie cirurgias de emergência, tratamentos médicos e ajuda humanitária. O seu zakat vai diretamente para quem mais precisa.",
    keywords: ["doação Síria", "ajuda médica Síria", "associação beneficente", "doação cirurgia urgência", "ajuda humanitária Síria", "zakat online", "sadaqa", "patrocinar paciente sírio", "auxílio emergência", "ONG humanitária", "refugiados sírios ajuda"],
    titleTemplate: "%s | Gözbebekleri",
    campaigns: {
      title: "Campanhas de Doação | Gözbebekleri – Salve Vidas na Síria",
      description: "Explore campanhas de doações médicas e humanitárias ativas. A sua doação financia cirurgias urgentes para pacientes sírios.",
    },
    about: {
      title: "Sobre Nós | Gözbebekleri Organização Humanitária",
      description: "Gözbebekleri é uma organização humanitária de confiança focada na ajuda médica na Síria. Conheça a nossa missão e impacto.",
    },
    contact: {
      title: "Contacte-Nos | Gözbebekleri",
      description: "Tem alguma dúvida ou quer fazer uma doação? Entre em contato com a equipa Gözbebekleri.",
    },
    blog: {
      title: "Notícias e Relatórios | Gözbebekleri",
      description: "Últimas notícias e relatórios de campo dos projetos humanitários e médicos da Gözbebekleri na Síria.",
    },
  },
  es: {
    siteName: "Gözbebekleri – Donación Humanitaria",
    title: "Gözbebekleri | Dona para Ayuda Médica en Siria – Zakat & Sadaqa",
    description: "Salva vidas en Siria — financia cirugías de emergencia, tratamientos médicos y ayuda humanitaria. Tu zakat llega directamente a quienes más lo necesitan.",
    keywords: ["donación Siria", "ayuda médica Siria", "organización benéfica", "donación cirugía urgente", "ayuda humanitaria Siria", "zakat online", "sadaqa", "patrocinar paciente sirio", "auxilio emergencia", "ONG humanitaria", "refugiados sirios ayuda"],
    titleTemplate: "%s | Gözbebekleri",
    campaigns: {
      title: "Campañas de Donación | Gözbebekleri – Salva Vidas en Siria",
      description: "Explora campañas de donación médica y humanitaria activas. Tu donación financia cirugías urgentes para pacientes sirios.",
    },
    about: {
      title: "Quiénes Somos | Gözbebekleri Organización Humanitaria",
      description: "Gözbebekleri es una organización humanitaria de confianza centrada en ayuda médica en Siria. Conoce nuestra misión e impacto.",
    },
    contact: {
      title: "Contáctanos | Gözbebekleri",
      description: "¿Tienes una pregunta o quieres donar? Contacta al equipo de Gözbebekleri y te responderemos pronto.",
    },
    blog: {
      title: "Noticias e Informes | Gözbebekleri",
      description: "Últimas noticias e informes de campo de los proyectos humanitarios y médicos de Gözbebekleri en Siria.",
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
