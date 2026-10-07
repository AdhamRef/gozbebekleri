"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import DonationDialog from "@/components/DonationDialog";
import { useCurrency } from "@/context/CurrencyContext";
import {
  IMPACT_GROUND_ORDER,
  IMPACT_STAGE_SLOTS,
  IMPACT_STATE_KEYS,
  impactLineUSD,
  pickText,
  resolveImpactState,
  type ImpactNeed,
  type ImpactRegion,
} from "@/lib/impact/config";

type Props = {
  impactCampaignId: string;
  campaignId: string;
  title: string;
  intro: string;
  regions: ImpactRegion[];
  needs: ImpactNeed[];
  allowMonthly: boolean;
};

/** { "<region>|<need>": quantity } */
type Picks = Record<string, number>;

const pickId = (region: string, need: string) => `${region}|${need}`;

/** Local assets and Cloudinary go through next/image; anything else is served as-is. */
const optimizable = (src: string) => src.startsWith("/") || src.startsWith("https://res.cloudinary.com/");

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fine paper grain behind the page so large empty areas don't read as flat white. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .08 0 0 0 0 .16 0 0 0 0 .24 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function usePersistentPicks(key: string): [Picks, (fn: (p: Picks) => Picks) => void] {
  const [picks, setPicks] = useState<Picks>({});
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) setPicks(JSON.parse(raw) as Picks);
    } catch {
      /* storage unavailable — start empty */
    }
  }, [key]);
  const update = useCallback(
    (fn: (p: Picks) => Picks) => {
      setPicks((prev) => {
        const next = fn(prev);
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key]
  );
  return [picks, update];
}

export default function ImpactBuilder({
  impactCampaignId,
  campaignId,
  title,
  intro,
  regions,
  needs,
  allowMonthly,
}: Props) {
  const t = useTranslations("ImpactBuilder");
  const locale = useLocale();
  const { convertToCurrency } = useCurrency();

  const firstActive = regions.find((r) => r.active)?.key ?? regions[0]?.key ?? "";
  const [regionKey, setRegionKey] = useState(firstActive);
  const [picks, setPicks] = usePersistentPicks(`impact:${impactCampaignId}:picks`);
  const [monthly, setMonthly] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  const region = regions.find((r) => r.key === regionKey) ?? regions[0];
  const needByKey = useMemo(() => new Map(needs.map((n) => [n.key, n])), [needs]);
  const activeRegionKeys = useMemo(() => new Set(regions.filter((r) => r.active).map((r) => r.key)), [regions]);

  /** Valid picks only (needs/regions may have been disabled since they were stored). */
  const lines = useMemo(
    () =>
      Object.entries(picks)
        .map(([id, quantity]) => {
          const [rk, nk] = id.split("|");
          const need = needByKey.get(nk);
          if (!need || !activeRegionKeys.has(rk) || quantity < 1) return null;
          const qty = Math.min(quantity, need.maxQuantity);
          return { regionKey: rk, needKey: nk, quantity: qty, amountUSD: impactLineUSD(need.priceUSD, qty) };
        })
        .filter((l): l is NonNullable<typeof l> => l != null),
    [picks, needByKey, activeRegionKeys]
  );

  const totalUSD = round2(lines.reduce((s, l) => s + l.amountUSD, 0));
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  // Donor currency (cookie) — null until exchange rates load.
  const rateInfo = convertToCurrency(1) as { convertedValue: number | null; currency: string | null };
  const rate = rateInfo.convertedValue;
  const currencyCode = rateInfo.currency || "USD";
  const toLocal = (usd: number) => (rate == null ? null : round2(usd * rate));
  const fmt = (usd: number) => {
    const v = toLocal(usd);
    if (v == null) return "…";
    try {
      return new Intl.NumberFormat(`${locale === "tr" ? "tr-TR" : "en-US"}-u-nu-latn`, {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "code",
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }).format(v);
    } catch {
      return `${v} ${currencyCode}`;
    }
  };
  const totalLocal = toLocal(totalUSD);

  const qtyOf = (rk: string, nk: string) => picks[pickId(rk, nk)] ?? 0;

  const bump = (need: ImpactNeed, delta: number) => {
    setPicks((prev) => {
      const id = pickId(regionKey, need.key);
      const nextQty = Math.min(need.maxQuantity, Math.max(0, (prev[id] ?? 0) + delta));
      const next = { ...prev };
      if (nextQty) next[id] = nextQty;
      else delete next[id];
      return next;
    });
    setPulse(true);
    window.setTimeout(() => setPulse(false), 180);
  };

  const resetRegion = () =>
    setPicks((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !id.startsWith(`${regionKey}|`))));

  // ── Stage: character picture for this region's picks + prop icons in fixed slots ──
  const regionPicked = useMemo(
    () => new Set(needs.filter((n) => qtyOf(regionKey, n.key) > 0).map((n) => n.key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needs, picks, regionKey]
  );
  const state = resolveImpactState(regionPicked);
  const shownStateKey = state && region?.images[state.key] ? state.key : "base";
  const covered = new Set<string>(state && region?.images[state.key] ? state.covers : []);

  const props = needs
    .filter((n) => n.kind === "prop" && regionPicked.has(n.key) && !covered.has(n.key))
    .sort((a, b) => a.priority - b.priority);
  const background = props.find((n) => n.placement === "background");
  const ground = props.filter((n) => n.placement !== "background").slice(0, IMPACT_GROUND_ORDER.length);
  const stageProps = [
    ...(background ? [{ need: background, slot: IMPACT_STAGE_SLOTS.BACKGROUND }] : []),
    ...ground.map((need, i) => ({ need, slot: IMPACT_STAGE_SLOTS[IMPACT_GROUND_ORDER[i]] })),
  ];

  const characterImages = region
    ? (["base", ...IMPACT_STATE_KEYS] as const)
        .map((k) => ({ key: k, src: region.images[k] }))
        .filter((x): x is { key: (typeof x)["key"]; src: string } => Boolean(x.src))
    : [];

  const breakdown = regions
    .map((r) => {
      const rl = lines.filter((l) => l.regionKey === r.key);
      if (!rl.length) return null;
      return {
        key: r.key,
        name: pickText(r.name, locale),
        usd: rl.reduce((s, l) => s + l.amountUSD, 0),
        qty: rl.reduce((s, l) => s + l.quantity, 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const canCheckout = totalUSD > 0 && totalLocal != null && totalLocal > 0;
  const openCheckout = () => {
    if (canCheckout) setCheckoutOpen(true);
  };

  const half = Math.ceil(needs.length / 2);
  const regionHasPicks = lines.some((l) => l.regionKey === regionKey);

  const stepper = (need: ImpactNeed, q: number, name: string, compact: boolean) => {
    const size = compact ? "h-9 w-9" : "h-10 w-10";
    return (
      <div dir="ltr" className="flex flex-none items-center justify-center gap-1.5">
        <button
          type="button"
          aria-label={`${t("dec")} — ${name}`}
          onClick={() => bump(need, -1)}
          disabled={!q}
          className={`flex ${size} items-center justify-center rounded-full border-[1.5px] transition active:scale-90 ${
            q ? "border-[#cfd8e1] bg-white text-[#14283c] hover:border-[#9fb0c1]" : "border-[#eef2f6] bg-[#f7f9fb] text-[#c3ccd6]"
          }`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span
          aria-live="polite"
          className={`min-w-[24px] text-center text-base font-extrabold tabular-nums ${q ? "text-[#14283c]" : "text-[#aeb9c4]"}`}
        >
          {q}
        </span>
        <button
          type="button"
          aria-label={`${t("inc")} — ${name}`}
          onClick={() => bump(need, 1)}
          disabled={q >= need.maxQuantity}
          className={`flex ${size} items-center justify-center rounded-full border-[1.5px] text-white shadow-sm transition active:scale-90 disabled:opacity-50 ${
            q ? "border-[#f07d22] bg-[#f07d22] hover:bg-[#e06f15]" : "border-[#0b5ea8] bg-[#0b5ea8] hover:bg-[#094f8e]"
          }`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const priceChip = (need: ImpactNeed, on: boolean) => (
    <span
      dir="ltr"
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[12.5px] font-extrabold ${
        on ? "bg-[#fdeada] text-[#98470d]" : "bg-[#eef3f8] text-[#6b7c8c]"
      }`}
    >
      {fmt(need.priceUSD)}
    </span>
  );

  const cardShell = (on: boolean) =>
    `rounded-2xl border bg-white/85 shadow-[0_4px_16px_rgba(20,40,60,.06)] backdrop-blur-sm transition ${
      on ? "border-[#f5b27a] ring-2 ring-[#f07d22]/15" : "border-[#e3eaf2] hover:border-[#cfdbe7]"
    }`;

  const icon = (need: ImpactNeed, on: boolean, box: string) => (
    <div className={`relative flex-none transition ${box} ${on ? "" : "opacity-75 saturate-[.6]"}`}>
      <Image src={need.icon} alt="" fill sizes="72px" className="object-contain" unoptimized={!optimizable(need.icon)} />
    </div>
  );

  /** Compact tile for the phone/tablet grid. */
  const renderTile = (need: ImpactNeed) => {
    const q = qtyOf(regionKey, need.key);
    const on = q > 0;
    const name = pickText(need.name, locale);
    return (
      <div key={need.key} className={`flex flex-col items-center gap-2 p-2.5 text-center ${cardShell(on)}`}>
        {icon(need, on, "h-12 w-12 sm:h-14 sm:w-14")}
        <strong className="line-clamp-2 min-h-[2.5em] text-[13.5px] leading-tight sm:text-sm">{name}</strong>
        {priceChip(need, on)}
        {stepper(need, q, name, true)}
      </div>
    );
  };

  /** Short horizontal row for the desktop side columns. */
  const renderRow = (need: ImpactNeed) => {
    const q = qtyOf(regionKey, need.key);
    const on = q > 0;
    const name = pickText(need.name, locale);
    return (
      <div key={need.key} className={`flex items-center gap-3 p-3 ${cardShell(on)}`}>
        {icon(need, on, "h-14 w-14 xl:h-16 xl:w-16")}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-start">
          <strong className="line-clamp-2 text-[15px] leading-tight">{name}</strong>
          {priceChip(need, on)}
        </div>
        {stepper(need, q, name, false)}
      </div>
    );
  };

  const totalLabel = canCheckout || totalUSD === 0 ? fmt(totalUSD) + (monthly ? ` / ${t("perMonth")}` : "") : t("ratesLoading");

  const stage = (
    <div className="relative isolate h-full overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#e4effa_0%,#f3f8fd_52%,#fdf0e3_100%)] shadow-[0_18px_40px_-18px_rgba(11,94,168,.35)] ring-1 ring-[#d6e3f0]">
      {/* Scene texture: dots, a soft sun and a ground band. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(rgba(11,94,168,.16)_1px,transparent_1.3px)] [background-size:16px_16px] [mask-image:linear-gradient(180deg,#000_0%,transparent_75%)]"
      />
      <div aria-hidden className="absolute -top-10 end-6 -z-10 h-40 w-40 rounded-full bg-[#ffd8a8]/50 blur-2xl" />
      <div
        aria-hidden
        className="absolute inset-x-[-10%] bottom-[-14%] -z-10 h-[34%] rounded-[50%] bg-[radial-gradient(ellipse_at_top,#f8dcc0_0%,#fbe9d8_45%,transparent_72%)]"
      />

      <div className="relative mx-auto aspect-[25/33] h-full max-w-full pt-3">
        <div className="relative h-full w-full">
          <div
            aria-hidden
            className="absolute bottom-1 left-1/2 z-[1] h-[22px] w-[56%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(20,40,60,.18),rgba(20,40,60,0)_70%)]"
          />
          {characterImages.map((img) => (
            <Image
              key={`${region?.key}-${img.key}`}
              src={img.src}
              alt={img.key === shownStateKey ? pickText(region?.name, locale) : ""}
              fill
              priority={img.key === "base"}
              sizes="(max-width: 1024px) 260px, 420px"
              unoptimized={!optimizable(img.src)}
              className={`z-40 object-contain object-bottom transition-opacity duration-200 ${
                img.key === shownStateKey ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          {stageProps.map(({ need, slot }) => (
            <div
              key={need.key}
              className="pointer-events-none absolute duration-300 animate-in fade-in zoom-in-75"
              style={{
                zIndex: slot.z,
                width: `${slot.k * 100}%`,
                left: `${(1 - slot.k) * slot.px}%`,
                bottom: `${100 - slot.py}%`,
              }}
            >
              <Image
                src={need.icon}
                alt=""
                width={256}
                height={256}
                sizes="(max-width: 1024px) 100px, 200px"
                unoptimized={!optimizable(need.icon)}
                className="h-auto w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Running count on the scene, so phones see progress without scrolling. */}
      {count > 0 && (
        <div className="absolute start-3 top-3 z-50 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-[#98470d] shadow-sm ring-1 ring-[#f5d3b5] lg:hidden">
          {`${count} ${t("unit")}`}
        </div>
      )}
    </div>
  );

  const summary = (
    <div className="w-full rounded-3xl border border-[#e3eaf2] bg-white/90 p-4 shadow-[0_10px_30px_-12px_rgba(20,40,60,.18)] backdrop-blur-sm sm:p-5">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="m-0 text-xs font-black uppercase tracking-[.14em] text-[#8b9aa8]">{t("impact")}</p>
        <button
          type="button"
          onClick={resetRegion}
          disabled={!regionHasPicks}
          className="px-1 py-0.5 text-[12.5px] font-extrabold text-[#0b5ea8] underline disabled:cursor-default disabled:text-[#c2ccd6] disabled:no-underline"
        >
          {t("reset")}
        </button>
      </div>
      {breakdown.map((b) => (
        <div key={b.key} className="flex justify-between py-0.5 text-sm text-[#5d6f80]">
          <span>{b.name}</span>
          <span dir="ltr" className="whitespace-nowrap">
            {fmt(b.usd)} · {b.qty} {t("unit")}
          </span>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 pb-3 pt-1">
        <span className="flex-none whitespace-nowrap text-sm text-[#7a8794]">
          {count === 0 ? t("none") : `${count} ${t("unit")}`}
        </span>
        <strong
          aria-live="polite"
          dir="ltr"
          className="inline-block whitespace-nowrap text-[clamp(24px,3vw,32px)] font-black tabular-nums tracking-tight transition-transform duration-200"
          style={{ transform: `scale(${pulse ? 1.08 : 1})` }}
        >
          {totalLabel}
        </strong>
      </div>

      {allowMonthly && (
        <label
          className={`mb-3 flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-2.5 ${
            monthly ? "border-[#f0a765] bg-[#fffaf5]" : "border-[#e9eef4] bg-[#fbfcfe]"
          }`}
        >
          <input
            type="checkbox"
            checked={monthly}
            onChange={() => setMonthly((m) => !m)}
            className="h-5 w-5 flex-none cursor-pointer accent-[#f07d22]"
          />
          <span className="grid gap-0.5 text-start">
            <strong className="text-sm">{t("monthly")}</strong>
            <span className="text-xs text-[#5d6f80]">{t("monthlyNote")}</span>
          </span>
        </label>
      )}

      <button
        type="button"
        onClick={openCheckout}
        disabled={!canCheckout}
        className="w-full rounded-full bg-[#f07d22] p-3.5 text-lg font-black text-white shadow-[0_12px_28px_rgba(240,125,34,.28)] transition hover:bg-[#e06f15] disabled:cursor-not-allowed disabled:bg-[#c6cfd8] disabled:shadow-none"
      >
        {t("cta")}
      </button>
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-[#5d6f80]">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {t("secure")}
      </p>
    </div>
  );

  return (
    <div className="relative isolate overflow-x-clip bg-[#f4f8fc] pb-28 text-[#14283c] lg:pb-10">
      {/* Page texture: paper grain, a fading dot grid and soft brand glows. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-[.35] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(11,94,168,.13)_1px,transparent_1.3px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_75%)]" />
        <div className="absolute -top-40 start-[-15%] h-[480px] w-[480px] rounded-full bg-[#0b5ea8]/[.09] blur-3xl" />
        <div className="absolute end-[-15%] top-[30%] h-[420px] w-[420px] rounded-full bg-[#f07d22]/[.09] blur-3xl" />
        <div className="absolute bottom-[-10%] start-[20%] h-[360px] w-[360px] rounded-full bg-[#38bdf8]/[.08] blur-3xl" />
      </div>

      <section className="mx-auto max-w-[1100px] px-4 pt-5 text-center sm:pt-7 lg:pt-6">
        <h1 className="mb-1.5 text-[clamp(22px,3vw,34px)] font-black leading-tight tracking-tight">{title}</h1>
        {intro && (
          <p className="mx-auto mb-4 max-w-[560px] text-sm leading-relaxed text-[#5d6f80] sm:text-[15px]">{intro}</p>
        )}

        {regions.length > 1 && (
          <div className="-mx-4 mb-3 overflow-x-auto px-4 [scrollbar-width:none] lg:mb-5 [&::-webkit-scrollbar]:hidden">
            <div
              role="tablist"
              aria-label={t("regions")}
              className="mx-auto flex w-max gap-1 rounded-full border border-[#e3eaf2] bg-white/80 p-1 shadow-sm backdrop-blur-sm"
            >
              {regions.map((r) => {
                const selected = r.key === regionKey;
                return (
                  <button
                    key={r.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-disabled={!r.active}
                    onClick={() => r.active && setRegionKey(r.key)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-extrabold transition sm:px-5 ${
                      !r.active
                        ? "cursor-not-allowed text-[#aab5c0]"
                        : selected
                          ? "bg-[#0b5ea8] text-white shadow-[0_4px_12px_rgba(11,94,168,.3)]"
                          : "text-[#6b7c8c] hover:text-[#0b5ea8]"
                    }`}
                  >
                    {pickText(r.name, locale)}
                    {!r.active && ` · ${t("soon")}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1280px] px-4 lg:px-6">
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(250px,1fr)_minmax(340px,440px)_minmax(250px,1fr)] lg:items-start lg:gap-6">
          <div className="hidden content-start gap-3 lg:grid">{needs.slice(0, half).map(renderRow)}</div>

          {/* Character stays in view while adding: under the navbar on phones, beside the lists on desktop. */}
          <div className="sticky top-16 z-30 -mx-4 bg-[#f4f8fc]/80 px-4 pb-3 pt-1 backdrop-blur-md lg:top-[120px] lg:mx-0 lg:flex lg:flex-col lg:gap-4 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="mx-auto h-[clamp(200px,34svh,320px)] w-full max-w-[440px] lg:h-[clamp(300px,calc(100svh-480px),480px)]">
              {stage}
            </div>
            <div className="hidden lg:block">{summary}</div>
          </div>

          <div className="hidden content-start gap-3 lg:grid">{needs.slice(half).map(renderRow)}</div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3 md:grid-cols-4 lg:hidden">{needs.map(renderTile)}</div>
          <div className="mx-auto mt-4 w-full max-w-[560px] lg:hidden">{summary}</div>
        </div>
      </section>

      {/* Mobile sticky bar */}
      {canCheckout && (
        <div className="fixed inset-x-0 bottom-0 z-[1000] flex items-center justify-between gap-3.5 border-t border-[#e9eef4] bg-white/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_28px_rgba(20,40,60,.1)] backdrop-blur-md lg:hidden">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="whitespace-nowrap text-xs text-[#5d6f80]">{`${count} ${t("unit")}`}</span>
            <strong dir="ltr" className="truncate text-lg">
              {totalLabel}
            </strong>
          </div>
          <button
            type="button"
            onClick={openCheckout}
            className="flex-none whitespace-nowrap rounded-full bg-[#f07d22] px-6 py-3 text-base font-extrabold text-white shadow-[0_8px_20px_rgba(240,125,34,.3)]"
          >
            {t("cta")}
          </button>
        </div>
      )}

      {/* Mounted per open so it always starts from the current total and frequency. */}
      {checkoutOpen && totalLocal != null && (
        <DonationDialog
          isOpen
          onClose={() => setCheckoutOpen(false)}
          campaignId={campaignId}
          campaignTitle={title}
          campaignImage={region?.images[shownStateKey] ?? region?.images.base}
          goalType="OPEN"
          initialDonationAmount={totalLocal}
          monthlyOnly={monthly}
          oneTimeOnly={!monthly}
          authCallbackUrl={typeof window !== "undefined" ? window.location.pathname : undefined}
          impact={{
            impactCampaignId,
            lines: lines.map(({ regionKey: rk, needKey, quantity }) => ({ regionKey: rk, needKey, quantity })),
          }}
        />
      )}
    </div>
  );
}
