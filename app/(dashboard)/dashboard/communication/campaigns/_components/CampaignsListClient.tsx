"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Megaphone, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignCard } from "./CampaignCard";
import { type CampaignRow, CHANNEL_META, STATUS_META } from "./campaign-ui";

export function CampaignsListClient() {
  const [campaigns, setCampaigns] = React.useState<CampaignRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [channel, setChannel] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/communication/campaigns", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "تعذّر تحميل الحملات");
      setCampaigns(json.campaigns ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Filtered client-side: the service caps the list at 200 rows, so this is a small in-memory set
  // and a round trip per keystroke would buy nothing.
  const filtered = campaigns.filter((c) => {
    if (channel !== "all" && c.channel !== channel) return false;
    if (status !== "all" && c.status !== status) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byChannel = (id: string) => campaigns.filter((c) => c.channel === id).length;

  return (
    <div dir="rtl">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث باسم الحملة…"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
            <Button size="sm" className="gap-1.5 bg-brand hover:bg-brand/90" asChild>
              <Link href="/dashboard/communication/campaigns/new">
                <Plus className="h-4 w-4" />
                حملة جديدة
              </Link>
            </Button>
          </>
        }
      >
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger aria-label="تصفية بالقناة" className="h-9 min-w-0 flex-1 rounded-lg border-slate-200 bg-slate-50 px-3 text-xs sm:flex-none sm:basis-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">كل القنوات</SelectItem>
            {Object.entries(CHANNEL_META).map(([id, m]) => (
              <SelectItem key={id} value={id} className="text-xs">
                {m.label} ({byChannel(id)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="تصفية بالحالة" className="h-9 min-w-0 flex-1 rounded-lg border-slate-200 bg-slate-50 px-3 text-xs sm:flex-none sm:basis-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">كل الحالات</SelectItem>
            {Object.entries(STATUS_META).map(([id, m]) => (
              <SelectItem key={id} value={id} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={campaigns.length === 0 ? "لا توجد حملات تسويقية بعد" : "لا توجد حملة مطابقة"}
          description={
            campaigns.length === 0
              ? "الحملة ترسل قالبًا واحدًا لمجموعة متبرعين تختارها — كلٌّ بلغته المفضّلة. ابدأ باختيار القناة."
              : "جرّب توسيع التصفية أو مسحها."
          }
          action={
            campaigns.length === 0 ? (
              <Button className="gap-1.5 bg-brand hover:bg-brand/90" asChild>
                <Link href="/dashboard/communication/campaigns/new">
                  <Plus className="h-4 w-4" />
                  إنشاء أول حملة
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setChannel("all");
                  setStatus("all");
                }}
              >
                مسح التصفية
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {filtered.length} حملة
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
