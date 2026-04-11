import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en", "fr", "tr", "id", "pt", "es"],
  defaultLocale: "ar",
});
