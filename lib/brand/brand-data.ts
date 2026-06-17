import type { BrandOrganizationProfile } from "./brand-types";

// Brand profiles are a lightweight source of truth for dashboard copy, templates, and future AI guardrails.
export const brandOrganizations: BrandOrganizationProfile[] = [
  {
    key: "minber_aksa",
    name: "Minber-i Aksa Derneği",
    displayName: "Minber-i Aksa",
    primaryLanguage: "tr",
    website: "minberiaksa.org",
    tone: "Modern Islamic, Al-Quds focused, trust-first, proof-led.",
    colors: [
      { name: "Trust Navy", value: "#10212B" },
      { name: "Aqsa Gold", value: "#D39A27" },
      { name: "Minber Red", value: "#A93428" },
    ],
    usageRules: [
      "Use Al-Quds in English instead of Jerusalem unless a legal context requires otherwise.",
      "Keep waqf, zakat, proof, certificates, and field updates visible in donor journeys.",
      "Avoid visual clutter; Islamic patterns should stay light and never cover text.",
    ],
    contactLines: ["minberiaksa.org", "Al-Quds / Al-Aqsa focused campaigns"],
  },
  {
    key: "gozbebekleri",
    name: "Gözbebekleri Derneği",
    displayName: "Gözbebekleri",
    primaryLanguage: "tr",
    website: "gozbebekleri.org",
    tone: "Warm, reliable, relief-focused, transparent.",
    colors: [
      { name: "Trust Blue", value: "#025EB8" },
      { name: "Deep Navy", value: "#10212B" },
    ],
    usageRules: [
      "Use the approved Gözbebekleri identity and logo assets.",
      "Show field proof and donor trust cues clearly.",
      "Keep Turkish donor flows simple and direct.",
    ],
    contactLines: ["gozbebekleri.org"],
  },
  {
    key: "burak",
    name: "Burak Derneği",
    displayName: "Burak Derneği",
    primaryLanguage: "tr",
    website: "burakdernegi.org",
    tone: "Soft, trustworthy, Turkish charity tone, clear qurban proof.",
    colors: [
      { name: "Burak Teal", value: "#025E73" },
      { name: "Soft Blue", value: "#EAF6FA" },
    ],
    usageRules: [
      "Use Turkish only in Burak campaign designs unless explicitly requested.",
      "For qurban designs include video-after-slaughter proof message when relevant.",
      "Use the approved soft white and Burak teal visual identity.",
    ],
    contactLines: ["www.burakdernegi.org", "+90 507 460 18 41", "@burakdernegi"],
  },
];
