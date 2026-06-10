"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Plug,
  Plus,
  Loader2,
  Pencil,
  Activity,
  RefreshCw,
  Power,
  PowerOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  ListChecks,
  ShieldAlert,
  PauseCircle,
  Clock,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConnectionDrawer } from "./ConnectionDrawer";
import { ProviderFoundationOverview } from "./ProviderFoundationOverview";
import { SyncPanel } from "./SyncPanel";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PLATFORM_ACCENT,
  PLATFORM_CATEGORY,
  PLATFORM_ICON,
  PLATFORM_LABELS,
  PLATFORMS,
  STATUS_LABELS,
  STATUS_PILL,
  type CategoryKey,
  type PlatformKey,
} from "./platform-meta";
import { getCountryLabel, getLocaleLabel } from "@/lib/marketing/locales-countries";

interface ConnectionRow {
  id: string;
  category: string;
  platform: string;
  name: string;
  accountId: string | null;
  accountName: string | null;
  status: string;
  enabled: boolean;
  supportedLocales: string[];
  supportedCountries: string[];
  defaultCurrency: string | null;
  lastSyncAt: string | null;
  lastTestAt: string | null;
  lastError: string | null;
  readiness: {
    completionPercent: number;
    missingRequiredFields: string[];
    missingOptionalFields: string[];
    nextStepMessage: string;
    status: string;
  };
}

interface ApiPayload {
  connections: ConnectionRow[];
  summary: {
    total: number;
    complete: number;
    incomplete: number;
    errored: number;
    disabled: number;
    lastSyncAt: string | null;
  };
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const PIXEL_APPLICABLE_PLATFORMS = new Set(["META", "GA4", "GOOGLE_ADS", "TIKTOK", "X"]);

export function ConnectionsPageClient() {
  const [data, setData] = React.useState<ApiPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState<CategoryKey | "ALL">("ALL");
  const [view, setView] = React.useState<"connections" | "sync">("connections");
  const [drawer, setDrawer] = React.useState<{
    open: boolean;
    editingId: string | null;
    initialPlatform?: PlatformKey;
  }>({ open: false, editingId: null });
  const [busyAction, setBusyAction] = React.useState<{ id: string; kind: string } | null>(null);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await axios.get<ApiPayload>("/api/admin/marketing-platform-connections");
      setData(r.data);
    } catch (e) {
      setError(
        axios.isAxiosError(e) && typeof e.response?.data?.error === "string"
          ? (e.response.data.error as string)
          : "فشل في تحميل الاتصالات"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredConnections = React.useMemo(() => {
    if (!data) return [];
    if (category === "ALL") return data.connections;
    return data.connections.filter((c) => c.category === category);
  }, [data, category]);

  const platformStats = React.useMemo(() => {
    const map = new Map<
      PlatformKey,
      {
        platform: PlatformKey;
        total: number;
        complete: number;
        incomplete: number;
        lastSyncAt: string | null;
        lastError: string | null;
      }
    >();
    for (const p of PLATFORMS) {
      map.set(p, {
        platform: p,
        total: 0,
        complete: 0,
        incomplete: 0,
        lastSyncAt: null,
        lastError: null,
      });
    }
    for (const c of data?.connections ?? []) {
      const slot = map.get(c.platform as PlatformKey);
      if (!slot) continue;
      slot.total += 1;
      if (c.readiness.completionPercent >= 100 && c.enabled) slot.complete += 1;
      else if (c.readiness.missingRequiredFields.length > 0) slot.incomplete += 1;
      if (c.lastSyncAt && (!slot.lastSyncAt || c.lastSyncAt > slot.lastSyncAt)) {
        slot.lastSyncAt = c.lastSyncAt;
      }
      if (c.lastError) slot.lastError = c.lastError;
    }
    return map;
  }, [data]);

  const handleAction = async (id: string, kind: "enable" | "disable" | "test" | "sync") => {
    setBusyAction({ id, kind });
    try {
      const r = await axios.post<{ status: string; message: string }>(
        `/api/admin/marketing-platform-connections/${id}/${kind}`
      );
      const msg = r.data?.message ?? "تم";
      if (r.data?.status === "active" || r.data?.status === "disabled") toast.success(msg);
      else if (r.data?.status === "missing_config") toast(msg, { icon: "⚙️" });
      else if (r.data?.status === "not_implemented") toast(msg, { icon: "ℹ️" });
      else toast(msg);
      fetchAll();
    } catch (e) {
      const message =
        axios.isAxiosError(e) && typeof e.response?.data?.error === "string"
          ? (e.response.data.error as string)
          : "فشل التنفيذ";
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleApplyToPixels = async (connection: ConnectionRow) => {
    if (!PIXEL_APPLICABLE_PLATFORMS.has(connection.platform)) {
      toast("هذه المنصة لا تُطبّق مباشرة على قسم البكسلات والتتبع", { icon: "ℹ️" });
      return;
    }
    if (connection.readiness.missingRequiredFields.length > 0) {
      toast("أكمل الحقول المطلوبة قبل تطبيق الاتصال على البكسلات", { icon: "⚙️" });
      return;
    }
    setBusyAction({ id: connection.id, kind: "apply-to-pixels" });
    try {
      const r = await axios.post<{ status: string; message: string; changedFields: string[] }>(
        `/api/admin/marketing-platform-connections/${connection.id}/apply-to-pixels`
      );
      toast.success(r.data.message ?? "تم تطبيق الاتصال على قسم البكسلات والتتبع");
    } catch (e) {
      const message =
        axios.isAxiosError(e) && typeof e.response?.data?.message === "string"
          ? (e.response.data.message as string)
          : axios.isAxiosError(e) && typeof e.response?.data?.error === "string"
          ? (e.response.data.error as string)
          : "فشل تطبيق الاتصال على قسم البكسلات";
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl p-2 bg-[#025EB8]/10 text-[#025EB8]">
            <Plug className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">ربط المنصات والحسابات</h1>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-2xl">
              إدارة حسابات الإعلانات والتحليلات والرسائل، ومراجعة اكتمال الإعدادات
              قبل المزامنة. يمكن تطبيق اتصال مكتمل على قسم «البكسلات والتتبع» عند الحاجة،
              بدون دمج القسمين أو كسر التتبع الحالي.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> تحديث
          </Button>
          <Button
            size="sm"
            onClick={() => setDrawer({ open: true, editingId: null })}
            className="gap-2 bg-[#025EB8] hover:bg-[#025EB8]/90"
          >
            <Plus className="w-4 h-4" /> إضافة اتصال
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
        <p className="text-[12px] text-sky-900 leading-relaxed">
          قسم Connections يظل مصدرًا لإدارة حسابات المنصات والمزامنة. زر «تطبيق على البكسلات» ينسخ القيم المناسبة فقط إلى
          صفحة «إعدادات البكسلات والتتبع» مثل Pixel ID وGA4 API Secret وCAPI Token، ولا يغير سلوك التبرعات مباشرة إلا بعد حفظ القيم هناك.
        </p>
      </div>

      <ProviderFoundationOverview />

      {/* View switcher */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 -mb-px">
        <button
          type="button"
          onClick={() => setView("connections")}
          className={cn(
            "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
            view === "connections"
              ? "border-[#025EB8] text-[#025EB8]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          الحسابات والاتصالات
        </button>
        <button
          type="button"
          onClick={() => setView("sync")}
          className={cn(
            "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
            view === "sync"
              ? "border-[#025EB8] text-[#025EB8]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          المزامنة
        </button>
      </div>

      {view === "sync" ? (
        <SyncPanel />
      ) : (
        <ConnectionsView />
      )}
      <ConnectionDrawer
        open={drawer.open}
        onOpenChange={(open) =>
          setDrawer({
            open,
            editingId: open ? drawer.editingId : null,
            initialPlatform: drawer.initialPlatform,
          })
        }
        editingId={drawer.editingId}
        initialPlatform={drawer.initialPlatform}
        onSaved={fetchAll}
      />
    </div>
  );

  function ConnectionsView() {
    return null;
  }
}
