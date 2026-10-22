import type { SupportedLocale } from "./locales";
export const NOT_FOUND_COPY: Record<SupportedLocale, { title: string; body: string; home: string; projects: string }> = {
  ar: { title: "الصفحة غير موجودة", body: "قد يكون الرابط غير صحيح أو لم تعد الصفحة متاحة.", home: "الصفحة الرئيسية", projects: "المشاريع" },
  en: { title: "Page not found", body: "The link may be incorrect or the page is no longer available.", home: "Home", projects: "Projects" },
  fr: { title: "Page introuvable", body: "Le lien est peut-être incorrect ou la page n’est plus disponible.", home: "Accueil", projects: "Projets" },
  tr: { title: "Sayfa bulunamadı", body: "Bağlantı yanlış olabilir veya sayfa artık mevcut olmayabilir.", home: "Ana sayfa", projects: "Projeler" },
  id: { title: "Halaman tidak ditemukan", body: "Tautan mungkin salah atau halaman sudah tidak tersedia.", home: "Beranda", projects: "Proyek" },
  pt: { title: "Página não encontrada", body: "O link pode estar incorreto ou a página já não está disponível.", home: "Início", projects: "Projetos" },
  es: { title: "Página no encontrada", body: "El enlace puede ser incorrecto o la página ya no está disponible.", home: "Inicio", projects: "Proyectos" },
  de: { title: "Seite nicht gefunden", body: "Der Link ist möglicherweise falsch oder die Seite ist nicht mehr verfügbar.", home: "Startseite", projects: "Projekte" },
};
