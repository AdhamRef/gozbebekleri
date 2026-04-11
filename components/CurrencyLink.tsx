"use client";

import * as React from "react";
import { IntlLink } from "@/i18n/intl-navigation";
import { getCurrencyCodeForLinks, mergeCurrencyIntoHref } from "@/lib/currency-link";

export const Link = React.forwardRef<
  React.ElementRef<typeof IntlLink>,
  React.ComponentPropsWithoutRef<typeof IntlLink>
>(function Link({ href, ...props }, ref) {
  const code = getCurrencyCodeForLinks();
  const merged = mergeCurrencyIntoHref(
    href as string | Record<string, unknown>,
    code
  ) as React.ComponentPropsWithoutRef<typeof IntlLink>["href"];

  return <IntlLink ref={ref} href={merged} {...props} />;
});

Link.displayName = "Link";
