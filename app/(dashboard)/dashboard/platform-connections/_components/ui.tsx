import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { STATUS_CLASS, STATUS_LABEL, type ConnStatus } from "@/lib/platform-connections/readiness";

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar");
}

export function StatusBadge({ status }: { status: ConnStatus }) {
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  backHref = "/dashboard/platform-connections",
  backLabel = "العودة للنظرة العامة",
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  backHref?: string | null;
  backLabel?: string;
}) {
  return (
    <section className="rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {eyebrow ? <p className="text-xs text-white/70">{eyebrow}</p> : null}
          <h1 className="mt-1.5 text-2xl font-black">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">{subtitle}</p>
        </div>
        {backHref ? (
          <Link href={backHref} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">
            {backLabel} <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-[#025EB8] shadow-sm transition hover:bg-white/90">
      {children}
    </Link>
  );
}

export function GhostLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20">
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b p-4">
      <div>
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Status card for the overview "حالة عامة" band. */
export function StatusCard({
  title,
  status,
  lastCheck,
  actionHref,
  actionLabel,
  detail,
}: {
  title: string;
  status: ConnStatus;
  lastCheck?: string | null;
  actionHref: string;
  actionLabel: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-700">{title}</span>
        <StatusBadge status={status} />
      </div>
      {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
      <p className="mt-2 text-[11px] text-slate-400">آخر فحص: {fmtDate(lastCheck)}</p>
      <Link href={actionHref} className="mt-3 inline-block text-xs font-bold text-[#025EB8] hover:underline">{actionLabel} ←</Link>
    </div>
  );
}

export function EnvOnlyNote() {
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-500">
      يتم ضبط هذا الربط من إعدادات السيرفر حاليًا.
    </p>
  );
}

/** Small "quick link" tile for the روابط سريعة grid. */
export function QuickLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-[#025EB8]/50 hover:shadow">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#025EB8]">{icon}</span>
      <span className="text-sm font-bold text-slate-800">{label}</span>
    </Link>
  );
}
