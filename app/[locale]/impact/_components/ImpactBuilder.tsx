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
  /** "page" = the full /impact page; "compact" = the homepage section (no title, no fixed bar). */
  variant?: "page" | "compact";
};

/** { "<region>|<need>": quantity } */
type Picks = Record<string, number>;

const pickId = (region: string, need: string) => `${region}|${need}`;

/** Local assets and Cloudinary go through next/image; anything else is served as-is. */
const optimizable = (src: string) => src.startsWith("/") || src.startsWith("https://res.cloudinary.com/");

const round2 = (n: number) => Math.round(n * 100) / 100;


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
  variant = "page",
}: Props) {
  const compact = variant === "compact";
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
    const size = compact ? "h-10 w-10" : "h-[42px] w-[42px]";
    return (
      <div dir="ltr" className="flex flex-none items-center justify-center gap-2">
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
          className={`min-w-[26px] text-center text-lg font-extrabold tabular-nums ${q ? "text-[#14283c]" : "text-[#aeb9c4]"}`}
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
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-extrabold transition-colors sm:text-[13.5px] ${
        on ? "bg-[#fdeada] text-[#98470d]" : "bg-[#f2f5f8] text-[#7a8794]"
      }`}
    >
      {fmt(need.priceUSD)}
    </span>
  );

  /** Borderless centred item: icon, name + price, stepper. Smaller on phones, roomier in the desktop side columns. */
  const renderCard = (need: ImpactNeed, small: boolean) => {
    const q = qtyOf(regionKey, need.key);
    const on = q > 0;
    const name = pickText(need.name, locale);
    return (
      <div
        key={need.key}
        className={`flex flex-col items-center text-center ${small ? "gap-2 px-1 py-1.5" : "gap-2.5 px-1.5 py-2.5"}`}
      >
        <div
          className={`relative flex-none transition duration-200 ${small ? "h-16 w-16" : "h-[84px] w-[84px]"} ${
            on ? "" : "opacity-[.72] saturate-[.55]"
          }`}
        >
          <Image src={need.icon} alt="" fill sizes="84px" className="object-contain" unoptimized={!optimizable(need.icon)} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <strong className={`leading-[1.3] ${small ? "text-[14.5px]" : "text-base"}`}>{name}</strong>
          {priceChip(need, on)}
        </div>
        {stepper(need, q, name, small)}
      </div>
    );
  };

  const totalLabel = canCheckout || totalUSD === 0 ? fmt(totalUSD) + (monthly ? ` / ${t("perMonth")}` : "") : t("ratesLoading");

  const stage = (
    <div className="relative isolate h-full">
      <div className="relative mx-auto aspect-[25/33] h-full max-w-full">
        <div className="relative h-full w-full">
          <div
            aria-hidden
            className="absolute bottom-0.5 left-1/2 z-[1] h-[26px] w-[54%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(20,40,60,.14),rgba(20,40,60,0)_70%)]"
          />
          {characterImages.map((img) => (
            <Image
              key={`${region?.key}-${img.key}`}
              src={img.src}
              alt={img.key === shownStateKey ? pickText(region?.name, locale) : ""}
              fill
              priority={img.key === "base"}
              sizes="(max-width: 1024px) 320px, 500px"
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
        <span
          dir="ltr"
          className="absolute start-1.5 top-1.5 z-50 rounded-full bg-[#0b5ea8] px-3 py-1 text-[13px] font-extrabold text-white lg:hidden"
        >
          {`${count} ${t("unit")}`}
        </span>
      )}
    </div>
  );

  const summary = (
    <div className="w-full border-t border-[#e9eef4] pt-5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
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
        <div key={b.key} className="flex justify-between py-1 text-sm text-[#5d6f80]">
          <span>{b.name}</span>
          <span dir="ltr" className="whitespace-nowrap">
            {fmt(b.usd)} · {b.qty} {t("unit")}
          </span>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 pb-5 pt-1.5">
        <span className="flex-none whitespace-nowrap text-[14.5px] text-[#7a8794]">
          {count === 0 ? t("none") : `${count} ${t("unit")}`}
        </span>
        <strong
          aria-live="polite"
          dir="ltr"
          className="inline-block min-w-0 truncate text-[clamp(28px,3.2vw,38px)] font-black tabular-nums tracking-[-1px] text-[#14283c] transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: `scale(${pulse ? 1.08 : 1})` }}
        >
          {totalLabel}
        </strong>
      </div>

      {allowMonthly && (
        <label
          className={`mb-3.5 flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3 ${
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
            <strong className="text-[14.5px]">{t("monthly")}</strong>
            <span className="text-[12.5px] text-[#5d6f80]">{t("monthlyNote")}</span>
          </span>
        </label>
      )}

      <button
        type="button"
        onClick={openCheckout}
        disabled={!canCheckout}
        className="w-full rounded-full bg-[#f07d22] px-2.5 py-4 text-[17px] font-black text-white shadow-[0_12px_28px_rgba(240,125,34,.28)] transition hover:bg-[#e06f15] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#f07d22] disabled:cursor-not-allowed disabled:bg-[#c6cfd8] disabled:shadow-none"
      >
        {t("cta")}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-[#5d6f80]">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {t("secure")}
      </p>
    </div>
  );

  return (
    <div
      className={`relative overflow-x-clip text-[#14283c] ${compact ? "" : "bg-[#fbfcfe] pb-28 lg:pb-[72px]"}`}
      style={
        compact
          ? undefined
          : { backgroundImage: "url('/bg.webp')", backgroundRepeat: "repeat", backgroundSize: "320px", backgroundBlendMode: "multiply" }
      }
    >
      <section className={`mx-auto max-w-[1100px] text-center ${compact ? "" : "px-4 pt-6 sm:pt-9 lg:pt-11"}`}>
        {!compact && (
          <h1 className="mb-2.5 text-[clamp(26px,3.8vw,42px)] font-black leading-[1.15] tracking-[-.5px]">{title}</h1>
        )}
        {!compact && intro && (
          <p className="mx-auto mb-6 max-w-[540px] text-[15px] leading-[1.75] text-[#5d6f80] [text-wrap:pretty] sm:mb-7 sm:text-[16.5px]">
            {intro}
          </p>
        )}

        {regions.length > 1 && (
          <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mb-10 [&::-webkit-scrollbar]:hidden">
            <div
              role="tablist"
              aria-label={t("regions")}
              className="mx-auto flex w-max gap-1.5 rounded-full bg-[#f1f5f9] p-1.5 sm:gap-2"
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
                    className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[14px] font-extrabold transition sm:px-[22px] sm:text-[14.5px] ${
                      !r.active
                        ? "cursor-not-allowed text-[#aab5c0]"
                        : selected
                          ? "bg-white text-[#0b5ea8] shadow-[0_2px_8px_rgba(20,40,60,.1)]"
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

      <section className={`mx-auto max-w-[1280px] ${compact ? "" : "px-4 sm:px-5"}`}>
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(220px,1fr)_minmax(380px,500px)_minmax(220px,1fr)] lg:items-start lg:gap-[30px]">
          <div className="hidden content-start gap-[34px] lg:grid">{needs.slice(0, half).map((n) => renderCard(n, false))}</div>

          {/* Character stays in view while adding: under the navbar on phones, beside the lists on desktop. */}
          <div className="sticky top-16 z-30 -mx-4 bg-[#fbfcfe]/90 px-4 pb-2 pt-1 backdrop-blur-md sm:-mx-5 sm:px-5 lg:top-[120px] lg:mx-0 lg:flex lg:flex-col lg:items-center lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="mx-auto h-[clamp(220px,38svh,380px)] w-full max-w-[320px] lg:h-[clamp(320px,calc(100svh-440px),600px)] lg:max-w-[500px]">
              {stage}
            </div>
            <div className="mt-[18px] hidden w-full max-w-[460px] lg:block">{summary}</div>
          </div>

          <div className="hidden content-start gap-[34px] lg:grid">{needs.slice(half).map((n) => renderCard(n, false))}</div>

          <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 pt-3 sm:grid-cols-3 md:grid-cols-4 lg:hidden">
            {needs.map((n) => renderCard(n, true))}
          </div>
          <div className="mx-auto mt-5 w-full max-w-[560px] lg:hidden">{summary}</div>
        </div>
      </section>

      {/* Mobile sticky bar */}
      {canCheckout && !compact && (
        <div className="fixed inset-x-0 bottom-0 z-[1000] flex items-center justify-between gap-3.5 border-t border-[#e9eef4] bg-white px-[18px] pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(20,40,60,.1)] lg:hidden">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="whitespace-nowrap text-[12.5px] text-[#5d6f80]">{`${count} ${t("unit")}`}</span>
            <strong dir="ltr" className="truncate text-[19px] font-black">
              {totalLabel}
            </strong>
          </div>
          <button
            type="button"
            onClick={openCheckout}
            className="flex-none whitespace-nowrap rounded-full bg-[#f07d22] px-[26px] py-3.5 text-base font-extrabold text-white"
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
