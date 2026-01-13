"use client";
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtl from 'stylis-plugin-rtl'
import {useLanguage, useLanguageBelirtec} from "@/main/utilities/language";

// NB: A unique `key` is important for it to work!
const options = {
  rtl: { key: 'css-ar', stylisPlugins: [rtl] },
  ltr: { key: 'css-en' },
}

export function RtlProvider({ children }) {
  let lang = useLanguageBelirtec();
  const dir = lang == 'ar' ? 'rtl' : 'ltr'
  const cache = createCache(options[dir])
  return <CacheProvider value={cache}>{children}</CacheProvider>
}