import { getLocale } from "next-intl/server";
import { isValidLocale } from "@/lib/locales";
import { NOT_FOUND_COPY } from "@/lib/not-found-copy";
export default async function PublicNotFound() {
  const rawLocale = await getLocale();
  const locale = isValidLocale(rawLocale) ? rawLocale : "ar";
  const copy = NOT_FOUND_COPY[locale];
  return <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-3xl space-y-6 px-4 py-24 text-center">
    <p className="text-5xl font-bold">404</p><h1 className="text-2xl font-bold">{copy.title}</h1><p>{copy.body}</p>
    <nav className="flex flex-wrap justify-center gap-4"><a className="rounded bg-blue-700 px-4 py-3 text-white" href={`/${locale}`}>{copy.home}</a><a className="rounded border px-4 py-3" href={`/${locale}/campaigns`}>{copy.projects}</a></nav>
  </main>;
}
