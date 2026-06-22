"use client";

import React from "react";
import Image from "next/image";
import { ChevronRight, FileText, Globe2, Heart, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import LanguageSwitcher from "./LanguageSelector";
import CurrencySelector from "./CurrencySelector";

const LOGO_URL = "/logo-white.png";

type FooterLink = { label: string; href: string };

type FooterCopy = {
  summary: string;
  donors: string;
  impact: string;
  join: string;
  legal: string;
  officialNotice: string;
  verifiedOnly: string;
  languageCurrency: string;
  copyrightName: string;
  links: Record<string, string>;
};

const arCopy: FooterCopy = {
  summary: "منبر الأقصى منصة تبرع رسمية لدعم القدس والأقصى وغزة ومشاريع الزكاة والوقف والصدقة عبر تجربة تبرع آمنة وواضحة الأثر.",
  donors: "للمتبرعين",
  impact: "الأثر والتقارير",
  join: "شارك معنا",
  legal: "الدعم والقانوني",
  officialNotice: "استخدم فقط بيانات التواصل والحسابات البنكية المنشورة رسميًا داخل الموقع.",
  verifiedOnly: "بيانات التواصل التفصيلية قيد التحقق قبل النشر النهائي.",
  languageCurrency: "اللغة والعملة",
  copyrightName: "مؤسسة منبر الأقصى الدولية",
  links: {
    projects: "المشاريع",
    funds: "الصناديق",
    zakat: "الزكاة",
    waqf: "الوقف",
    recurring: "التبرع الدوري",
    donorAccount: "حساب المتبرع",
    achievements: "الإنجازات",
    stories: "القصص والتحديثات",
    reports: "التقارير",
    knowledge: "مركز المعرفة",
    becomePartner: "كن شريكًا لنا",
    volunteer: "تطوع معنا",
    partnerProjects: "مشاريع الشركاء",
    bankAccounts: "الحسابات البنكية",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    contact: "تواصل معنا",
  },
};

const enCopy: FooterCopy = {
  summary: "Minber-i Aksa is an official donation platform supporting Al-Quds, Al-Aqsa, Gaza, zakat, waqf and sadaqah projects through a secure and transparent giving experience.",
  donors: "For Donors",
  impact: "Impact and Reports",
  join: "Join Us",
  legal: "Support and Legal",
  officialNotice: "Use only contact and bank details published officially on the website.",
  verifiedOnly: "Detailed contact information is pending final verification before production publication.",
  languageCurrency: "Language and Currency",
  copyrightName: "Minber-i Aksa International Association",
  links: {
    projects: "Projects",
    funds: "Funds",
    zakat: "Zakat",
    waqf: "Waqf",
    recurring: "Recurring Giving",
    donorAccount: "Donor Account",
    achievements: "Achievements",
    stories: "Stories and Updates",
    reports: "Reports",
    knowledge: "Knowledge Center",
    becomePartner: "Become a Partner",
    volunteer: "Volunteer with Us",
    partnerProjects: "Partner Projects",
    bankAccounts: "Bank Accounts",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    contact: "Contact",
  },
};

const trCopy: FooterCopy = {
  ...enCopy,
  summary: "Minber-i Aksa; Kudüs, Mescid-i Aksa, Gazze, zekat, vakıf ve sadaka projeleri için güvenli ve şeffaf bağış deneyimi sunan resmi bağış platformudur.",
  donors: "Bağışçılar",
  impact: "Etki ve Raporlar",
  join: "Bize Katılın",
  legal: "Destek ve Yasal",
  officialNotice: "Yalnızca web sitesinde resmi olarak yayınlanan iletişim ve banka bilgilerini kullanın.",
  verifiedOnly: "Ayrıntılı iletişim bilgileri son yayın öncesi doğrulanacaktır.",
  languageCurrency: "Dil ve Para Birimi",
  copyrightName: "Minber-i Aksa Derneği",
  links: {
    projects: "Projeler",
    funds: "Fonlar",
    zakat: "Zekat",
    waqf: "Vakıf",
    recurring: "Düzenli Bağış",
    donorAccount: "Bağışçı Hesabı",
    achievements: "Başarılar",
    stories: "Hikayeler",
    reports: "Raporlar",
    knowledge: "Bilgi Merkezi",
    becomePartner: "Partner Olun",
    volunteer: "Gönüllü Olun",
    partnerProjects: "Partner Projeleri",
    bankAccounts: "Banka Hesapları",
    privacy: "Gizlilik Politikası",
    terms: "Kullanım Şartları",
    contact: "İletişim",
  },
};

function getCopy(locale: string): FooterCopy {
  if (locale === "ar") return arCopy;
  if (locale === "tr") return trCopy;
  return enCopy;
}

function columns(copy: FooterCopy): Array<{ title: string; links: FooterLink[] }> {
  return [
    {
      title: copy.donors,
      links: [
        { label: copy.links.projects, href: "/campaigns" },
        { label: copy.links.funds, href: "/campaigns" },
        { label: copy.links.zakat, href: "/campaigns" },
        { label: copy.links.waqf, href: "/campaigns" },
        { label: copy.links.recurring, href: "/campaigns" },
        { label: copy.links.donorAccount, href: "/profile" },
      ],
    },
    {
      title: copy.impact,
      links: [
        { label: copy.links.achievements, href: "/blog" },
        { label: copy.links.stories, href: "/blog" },
        { label: copy.links.reports, href: "/blog" },
        { label: copy.links.knowledge, href: "/blog" },
      ],
    },
    {
      title: copy.join,
      links: [
        { label: copy.links.becomePartner, href: "/contact-us" },
        { label: copy.links.volunteer, href: "/contact-us" },
        { label: copy.links.partnerProjects, href: "/campaigns" },
      ],
    },
    {
      title: copy.legal,
      links: [
        { label: copy.links.bankAccounts, href: "/bank-transfer" },
        { label: copy.links.privacy, href: "/privacy" },
        { label: copy.links.terms, href: "/terms" },
        { label: copy.links.contact, href: "/contact-us" },
      ],
    },
  ];
}

const Footer = () => {
  const locale = useLocale();
  const copy = getCopy(locale);

  return (
    <footer className="bg-[#10212B] text-[#FFFDF8]">
      <div className="border-b border-white/10 bg-[#132C38]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-[#E8D8BE] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D39A27]" />
            <span>{copy.officialNotice}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-white/45 sm:inline">{copy.languageCurrency}</span>
            <LanguageSwitcher onDark />
            <CurrencySelector onDark />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex">
              <Image src={LOGO_URL} alt="Minber-i Aksa" width={180} height={64} className="h-14 w-auto object-contain" />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/70">{copy.summary}</p>

            <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#D39A27]" />
                <Link href="/bank-transfer" className="hover:text-white">{copy.links.bankAccounts}</Link>
              </div>
              <div className="text-white/55">{copy.verifiedOnly}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            {columns(copy).map((column) => (
              <div key={column.title}>
                <h4 className="border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#D39A27]">
                  {column.title}
                </h4>
                <ul className="mt-5 space-y-3">
                  {column.links.map((item) => (
                    <li key={item.href + item.label}>
                      <Link href={item.href} className="group flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-white">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#D39A27] transition-transform group-hover:translate-x-0.5" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#0B1A22]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/50 sm:flex-row sm:px-6 lg:px-8">
          <p className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-[#A93428]" />
            © {new Date().getFullYear()} {copy.copyrightName}
          </p>
          <p className="flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5 text-[#D39A27]" />
            minberiaksa.org
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
