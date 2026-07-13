import Link from "next/link";
import { Plug, ArrowLeft } from "lucide-react";

/**
 * Non-breaking banner shown on legacy setup pages whose management now also lives under
 * «ربط المنصات والإرسال». The old page keeps working; this only points users to the new hub.
 */
export function PlatformConnectionsMovedNotice({
  href = "/dashboard/platform-connections",
  label = "فتح ربط المنصات والإرسال",
  text = "تم نقل إدارة هذا الإعداد إلى «ربط المنصات والإرسال».",
}: {
  href?: string;
  label?: string;
  text?: string;
}) {
  return (
    <div dir="rtl" className="mb-4 flex flex-col gap-3 rounded-xl border border-[#025EB8]/30 bg-blue-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#025EB8]/10 text-[#025EB8]"><Plug className="h-4 w-4" /></span>
        <p className="text-sm font-semibold leading-6 text-slate-700">
          {text}
        </p>
      </div>
      <Link href={href} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-[#025EB8] px-4 text-xs font-bold text-white transition hover:bg-[#024a92]">
        {label} <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
