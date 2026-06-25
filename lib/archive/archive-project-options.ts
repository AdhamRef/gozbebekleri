export const ARCHIVE_YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => String(new Date().getFullYear() - index));

export const ARCHIVE_COUNTRY_OPTIONS = ["فلسطين", "السودان", "سوريا", "تركيا", "اليمن", "لبنان", "عام"];

export const ARCHIVE_CITY_OPTIONS = ["غزة", "القدس", "الخرطوم", "إدلب", "إسطنبول", "صنعاء", "عام"];

export const ARCHIVE_THEME_OPTIONS = ["مياه", "طرود", "إفطار", "كفالات", "زكاة", "وقف", "تعليم", "صحة", "إيواء", "أضاحي"];

export const ARCHIVE_PROJECT_TYPE_OPTIONS = ["إغاثة طارئة", "مشروع موسمي", "مشروع دائم", "توثيق ميداني", "حملة تسويقية", "ملف رسمي"];
