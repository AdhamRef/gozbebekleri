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
  const qtyByRegion = new Map(breakdown.map((b) => [b.key, b.qty]));

  const priceChip = (need: ImpactNeed, on: boolean, small = false) => (
    <span
      dir="ltr"
      className={`whitespace-nowrap rounded-full font-extrabold ${small ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-[12.5px]"} ${
        on ? "bg-[#fdeada] text-[#98470d]" : "bg-[#eef3f8] text-[#6b7c8c]"
      }`}
    >
      {fmt(need.priceUSD)}
    </span>
  );

  const cardShell = (on: boolean) =>
    `rounded-2xl border bg-white/90 shadow-[0_4px_14px_rgba(20,40,60,.06)] transition ${
      on ? "border-[#f5b27a] ring-2 ring-[#f07d22]/15" : "border-[#e3eaf2]"
    }`;

  const icon = (need: ImpactNeed, on: boolean, box: string) => (
    <div className={`relative flex-none transition ${box} ${on ? "" : "opacity-75 saturate-[.6]"}`}>
      <Image src={need.icon} alt="" fill sizes="64px" className="object-contain" unoptimized={!optimizable(need.icon)} />
    </div>
  );

  /**
   * Phone/tablet tile: tapping the tile adds one, the corner button takes one away.
   * Small enough that all needs fit under the character on one screen.
   */
  const renderTile = (need: ImpactNeed) => {
    const q = qtyOf(regionKey, need.key);
    const on = q > 0;
    const name = pickText(need.name, locale);
    return (
      <div
        key={need.key}
        className={`relative [@media(max-height:640px)]:w-[84px] [@media(max-height:640px)]:flex-none ${cardShell(on)}`}
      >
        <button
          type="button"
          aria-label={`${t("inc")} — ${name}`}
          onClick={() => bump(need, 1)}
          disabled={q >= need.maxQuantity}
          className="flex h-full w-full flex-col items-center gap-1 rounded-2xl px-1 pb-1.5 pt-2 text-center transition active:scale-95 disabled:cursor-not-allowed"
        >
          {icon(need, on, "h-10 w-10 sm:h-14 sm:w-14 [@media(max-height:640px)]:h-9 [@media(max-height:640px)]:w-9")}
          <span className="line-clamp-2 flex min-h-[2.3em] items-center text-[11.5px] font-bold leading-tight sm:text-[13px]">
            {name}
          </span>
          {priceChip(need, on, true)}
        </button>
        {on && (
          <>
            <span
              aria-live="polite"
              className="pointer-events-none absolute -end-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f07d22] px-1.5 text-xs font-black tabular-nums text-white shadow"
            >
              {q}
            </span>
            <button
              type="button"
              aria-label={`${t("dec")} — ${name}`}
              onClick={() => bump(need, -1)}
              className="absolute -start-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#cfd8e1] bg-white text-[#14283c] shadow active:scale-90"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    );
  };

  /** Desktop side-column row with an explicit stepper. */
  const renderRow = (need: ImpactNeed) => {
    const q = qtyOf(regionKey, need.key);
    const on = q > 0;
    const name = pickText(need.name, locale);
    return (
      <div key={need.key} className={`flex flex-none items-center gap-3 p-2.5 ${cardShell(on)}`}>
        {icon(need, on, "h-12 w-12 xl:h-14 xl:w-14")}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-start">
          <strong className="line-clamp-2 text-[14.5px] leading-tight">{name}</strong>
          {priceChip(need, on)}
        </div>
        <div dir="ltr" className="flex flex-none items-center gap-1.5">
          <button
            type="button"
            aria-label={`${t("dec")} — ${name}`}
            onClick={() => bump(need, -1)}
            disabled={!q}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] transition active:scale-90 ${
              q ? "border-[#cfd8e1] bg-white text-[#14283c] hover:border-[#9fb0c1]" : "border-[#eef2f6] bg-[#f7f9fb] text-[#c3ccd6]"
            }`}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            aria-live="polite"
            className={`min-w-[22px] text-center text-base font-extrabold tabular-nums ${q ? "text-[#14283c]" : "text-[#aeb9c4]"}`}
          >
            {q}
          </span>
          <button
            type="button"
            aria-label={`${t("inc")} — ${name}`}
            onClick={() => bump(need, 1)}
            disabled={q >= need.maxQuantity}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] text-white shadow-sm transition active:scale-90 disabled:opacity-50 ${
              q ? "border-[#f07d22] bg-[#f07d22] hover:bg-[#e06f15]" : "border-[#0b5ea8] bg-[#0b5ea8] hover:bg-[#094f8e]"
            }`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const totalLabel = canCheckout || totalUSD === 0 ? fmt(totalUSD) + (monthly ? ` / ${t("perMonth")}` : "") : t("ratesLoading");
  const pulseStyle = { transform: `scale(${pulse ? 1.08 : 1})` };

  const monthlyToggle = (withNote: boolean) =>
    allowMonthly && (
      <label
        className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2 ${
          monthly ? "border-[#f0a765] bg-[#fffaf5]" : "border-[#e3eaf2] bg-white/90"
        }`}
      >
        <input
          type="checkbox"
          checked={monthly}
          onChange={() => setMonthly((m) => !m)}
          className="h-[18px] w-[18px] flex-none cursor-pointer accent-[#f07d22]"
        />
        <span className="grid min-w-0 gap-0.5 text-start">
          <strong className="truncate text-[13px]">{t("monthly")}</strong>
          {withNote && <span className="truncate text-xs text-[#5d6f80]">{t("monthlyNote")}</span>}
        </span>
      </label>
    );

  const resetButton = (
    <button
      type="button"
      onClick={resetRegion}
      disabled={!regionHasPicks}
      className="flex-none px-1 py-0.5 text-[12.5px] font-extrabold text-[#0b5ea8] underline disabled:cursor-default disabled:text-[#c2ccd6] disabled:no-underline"
    >
      {t("reset")}
    </button>
  );

  return (
    <div className="relative isolate overflow-x-clip bg-[#f4f8fc] pb-[calc(66px+env(safe-area-inset-bottom))] text-[#14283c] lg:pb-0">
      {/* Page texture: a fading dot grid and soft brand glows. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(11,94,168,.13)_1px,transparent_1.3px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_75%)]" />
        <div className="absolute -top-40 start-[-15%] h-[480px] w-[480px] rounded-full bg-[#0b5ea8]/[.09] blur-3xl" />
        <div className="absolute end-[-15%] top-[30%] h-[420px] w-[420px] rounded-full bg-[#f07d22]/[.09] blur-3xl" />
      </div>

      {/*
        One screen tall on every device: navbar (4rem / 104px) and, on phones, the
        fixed checkout bar (~66px) are subtracted so the character, every need and the
        total are visible together without scrolling.
      */}
      <div
        className="mx-auto grid h-[calc(100svh-4rem-66px-env(safe-area-inset-bottom))] min-h-[460px] max-w-[1280px] grid-rows-[auto_minmax(150px,1fr)_auto_auto] gap-2 px-3 pb-2 pt-2 sm:gap-3 sm:px-5 sm:pt-4
          lg:h-[calc(100svh-104px)] lg:max-h-[1000px] lg:min-h-[560px] lg:grid-cols-[minmax(250px,1fr)_minmax(300px,440px)_minmax(250px,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:gap-y-4 lg:px-6 lg:pb-5 lg:pt-4"
      >
        <header className="text-center lg:col-span-3">
          <h1 className="mb-1 text-[clamp(20px,2.6vw,32px)] font-black leading-tight tracking-tight">{title}</h1>
          {intro && (
            <p className="mx-auto mb-2 hidden max-w-[560px] text-sm leading-relaxed text-[#5d6f80] sm:block [@media(max-height:760px)]:hidden">
              {intro}
            </p>
          )}
          {regions.length > 1 && (
            <div className="-mx-3 overflow-x-auto px-3 pt-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
              <div
                role="tablist"
                aria-label={t("regions")}
                className="mx-auto flex w-max gap-1 rounded-full border border-[#e3eaf2] bg-white/85 p-1 shadow-sm"
              >
                {regions.map((r) => {
                  const selected = r.key === regionKey;
                  const picked = qtyByRegion.get(r.key);
                  return (
                    <button
                      key={r.key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-disabled={!r.active}
                      onClick={() => r.active && setRegionKey(r.key)}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-extrabold transition sm:px-5 sm:py-2 sm:text-[13.5px] ${
                        !r.active
                          ? "cursor-not-allowed text-[#aab5c0]"
                          : selected
                            ? "bg-[#0b5ea8] text-white shadow-[0_4px_12px_rgba(11,94,168,.3)]"
                            : "text-[#6b7c8c] hover:text-[#0b5ea8]"
                      }`}
                    >
                      {pickText(r.name, locale)}
                      {!r.active && ` · ${t("soon")}`}
                      {picked ? (
                        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#f07d22] px-1 text-[10.5px] font-black tabular-nums text-white">
                          {picked}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        <div className="hidden min-h-0 flex-col justify-center gap-2.5 overflow-y-auto p-1 lg:col-start-1 lg:row-start-2 lg:flex">
          {needs.slice(0, half).map(renderRow)}
        </div>

        {/* Character scene — fills whatever height is left, so it is always in view. */}
        <div className="min-h-0 lg:col-start-2 lg:row-start-2">
          <div className="relative isolate mx-auto h-full w-full max-w-[440px] overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#e4effa_0%,#f3f8fd_52%,#fdf0e3_100%)] shadow-[0_18px_40px_-18px_rgba(11,94,168,.35)] ring-1 ring-[#d6e3f0] sm:rounded-[28px]">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(rgba(11,94,168,.16)_1px,transparent_1.3px)] [background-size:16px_16px] [mask-image:linear-gradient(180deg,#000_0%,transparent_75%)]"
            />
            <div aria-hidden className="absolute -top-10 end-6 -z-10 h-40 w-40 rounded-full bg-[#ffd8a8]/50 blur-2xl" />
            <div
              aria-hidden
              className="absolute inset-x-[-10%] bottom-[-14%] -z-10 h-[34%] rounded-[50%] bg-[radial-gradient(ellipse_at_top,#f8dcc0_0%,#fbe9d8_45%,transparent_72%)]"
            />

            <div className="relative mx-auto aspect-[25/33] h-full max-w-full pt-2">
              <div className="relative h-full w-full">
                <div
                  aria-hidden
                  className="absolute bottom-1 left-1/2 z-[1] h-[20px] w-[56%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(20,40,60,.18),rgba(20,40,60,0)_70%)]"
                />
                {characterImages.map((img) => (
                  <Image
                    key={`${region?.key}-${img.key}`}
                    src={img.src}
                    alt={img.key === shownStateKey ? pickText(region?.name, locale) : ""}
                    fill
                    priority={img.key === "base"}
                    sizes="(max-width: 1024px) 300px, 420px"
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
          </div>
        </div>

        <div className="hidden min-h-0 flex-col justify-center gap-2.5 overflow-y-auto p-1 lg:col-start-3 lg:row-start-2 lg:flex">
          {needs.slice(half).map(renderRow)}
        </div>

        {/* Phones/tablets: every need at once under the character; a swipe strip on very short screens. */}
        <div className="mx-auto grid w-full max-w-[720px] grid-cols-4 gap-2 pt-1.5 sm:gap-3 lg:hidden [@media(max-height:640px)]:-mx-3 [@media(max-height:640px)]:flex [@media(max-height:640px)]:w-auto [@media(max-height:640px)]:max-w-none [@media(max-height:640px)]:overflow-x-auto [@media(max-height:640px)]:px-3 [@media(max-height:640px)]:pb-1 [@media(max-height:640px)]:[scrollbar-width:none]">
          {needs.map(renderTile)}
        </div>

        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-2 lg:hidden">
          {monthlyToggle(false) || <span className="text-xs text-[#7a8794]">{count === 0 ? t("none") : `${count} ${t("unit")}`}</span>}
          {resetButton}
        </div>

        {/* Desktop summary: one slim bar under the scene instead of a tall card. */}
        <div className="hidden items-center gap-4 rounded-3xl border border-[#e3eaf2] bg-white/90 px-5 py-3 shadow-[0_10px_30px_-12px_rgba(20,40,60,.18)] backdrop-blur-sm lg:col-span-3 lg:row-start-3 lg:flex">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="m-0 text-[11px] font-black uppercase tracking-[.14em] text-[#8b9aa8]">{t("impact")}</p>
              {resetButton}
            </div>
            <p className="m-0 truncate text-sm text-[#5d6f80]">
              {count === 0
                ? t("none")
                : breakdown.map((b) => `${b.name}: ${b.qty} ${t("unit")}`).join(" · ")}
            </p>
          </div>
          <div className="max-w-[340px] flex-none">{monthlyToggle(true)}</div>
          <strong
            aria-live="polite"
            dir="ltr"
            className="inline-block flex-none whitespace-nowrap text-[clamp(22px,2.2vw,30px)] font-black tabular-nums tracking-tight transition-transform duration-200"
            style={pulseStyle}
          >
            {totalLabel}
          </strong>
          <div className="flex flex-none flex-col items-center gap-1">
            <button
              type="button"
              onClick={openCheckout}
              disabled={!canCheckout}
              className="rounded-full bg-[#f07d22] px-9 py-3 text-lg font-black text-white shadow-[0_12px_28px_rgba(240,125,34,.28)] transition hover:bg-[#e06f15] disabled:cursor-not-allowed disabled:bg-[#c6cfd8] disabled:shadow-none"
            >
              {t("cta")}
            </button>
            <span className="flex items-center gap-1 text-[11px] text-[#5d6f80]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {t("secure")}
            </span>
          </div>
        </div>
      </div>

      {/* Phone/tablet checkout bar — always shown so the layout height never jumps. */}
      <div className="fixed inset-x-0 bottom-0 z-[1000] border-t border-[#e9eef4] bg-white/95 shadow-[0_-8px_28px_rgba(20,40,60,.1)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5">
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 whitespace-nowrap text-xs text-[#5d6f80]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {count === 0 ? t("none") : `${count} ${t("unit")}`}
            </span>
            <strong
              aria-live="polite"
              dir="ltr"
              className="inline-block truncate text-lg font-black tabular-nums transition-transform duration-200"
              style={pulseStyle}
            >
              {totalLabel}
            </strong>
          </div>
          <button
            type="button"
            onClick={openCheckout}
            disabled={!canCheckout}
            className="flex-none whitespace-nowrap rounded-full bg-[#f07d22] px-6 py-3 text-base font-extrabold text-white shadow-[0_8px_20px_rgba(240,125,34,.3)] disabled:bg-[#c6cfd8] disabled:shadow-none"
          >
            {t("cta")}
          </button>
        </div>
      </div>

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
