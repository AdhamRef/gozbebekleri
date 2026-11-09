"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LocalizedSharePrice } from "@/components/LocalizedSharePrice";
import type { SiteBanner } from "@/lib/minbar/banners";
function pageFor(path: string) {
 const segment = path.split("/").filter(Boolean).slice(1);
 if (!segment.length) return "home";
 if (segment[0] === "campaign") return "projectDetail";
 if (segment[0] === "campaigns" || segment[0] === "category") return "projects";
 if (segment[0] === "programs") return "programs";
 if (segment[0] === "blog") return segment.length > 1 && segment[1] !== "category" ? "article" : "blog";
 return null;
}
export function ManagedBannerSlots({locale, slot}: {locale: string; slot: "top" | "bottom"}) {
 const pathname = usePathname(), page = pageFor(pathname), [banners, setBanners] = useState<SiteBanner[]>([]);
 useEffect(() => { setBanners([]); if (!page) return; const controller = new AbortController();
  fetch(`/api/urgent-banners?locale=${encodeURIComponent(locale)}&page=${page}&slot=${slot}`, {signal: controller.signal}).then(res => res.ok ? res.json() : {items: []}).then(data => { if (!controller.signal.aborted) setBanners(data.items || []); }).catch(() => {});
  return () => controller.abort();
 }, [locale, page, slot, pathname]);
 if (!page) return null;
 return <div className="mx-auto max-w-7xl space-y-4 px-4">{banners.map(banner => <section key={banner.id} className="my-5 overflow-hidden rounded-2xl border bg-slate-900 text-white" aria-label={banner.title} style={{backgroundColor: {red: "#7c2318", navy: "#15263c", gold: "#91691b", green: "#1c6651"}[banner.tone]}}>
  {banner.kicker ? <p className="bg-amber-100 p-3 text-center text-slate-900">{banner.kicker}</p> : null}
  <div className="grid items-center md:grid-cols-2">{banner.image ? <img src={banner.image} alt={banner.imageAlt || banner.title} className={`h-64 w-full object-cover ${banner.textSide === "start" ? "md:order-2" : ""}`} /> : null}<div className="space-y-4 p-6"><h2 className="text-2xl font-bold">{banner.title}</h2><p>{banner.description}</p><div className="flex flex-wrap gap-2">{banner.chips.map((chip, i) => <span className="rounded border px-3 py-2" key={i}><LocalizedSharePrice sharePriceUSD={chip.usd} /> {chip.label}</span>)}</div><div className="flex flex-wrap gap-3">{banner.cta ? <Link className="rounded bg-white px-4 py-2 text-slate-900" href={banner.cta.href}>{banner.cta.label || banner.title}</Link> : null}{banner.ctaSecondary ? <Link className="rounded border px-4 py-2" href={banner.ctaSecondary.href}>{banner.ctaSecondary.label}</Link> : null}</div></div></div>
 </section>)}</div>;
}
