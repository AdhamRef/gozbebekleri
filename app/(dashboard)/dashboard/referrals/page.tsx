"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Link2, Plus, BarChart3, Infinity } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ReferralRow {
  id: string;
  code: string;
  name: string | null;
  cookieExpiryDays?: number;
  createdAt: string;
  donationsCount: number;
}

export default function ReferralsPage() {
  const [list, setList] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [cookieExpiryDays, setCookieExpiryDays] = useState(30);
  const [cookieUnlimited, setCookieUnlimited] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referrals");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to load");
      }
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast.error("فشل في تحميل قائمة الإحالات");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = createCode.trim();
    if (!code) {
      toast.error("أدخل رمز التتبع");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name: createName.trim() || undefined,
          cookieExpiryDays: cookieUnlimited ? 0 : (cookieExpiryDays > 0 ? cookieExpiryDays : 30),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "فشل في إنشاء الرابط");
        return;
      }
      toast.success("تم إنشاء الرابط");
      setCreateCode("");
      setCreateName("");
      setCookieExpiryDays(30);
      setCookieUnlimited(false);
      setDialogOpen(false);
      fetchList();
    } finally {
      setCreating(false);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const localePrefix = "/ar";

  return (
    <div className="min-h-0" dir="rtl">
      <div className="p-0 sm:p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <Card className="border-border shadow-sm overflow-hidden">
          {/* Table header: title + add button */}
          <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/40 px-4 sm:px-6 py-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              قائمة الروابط
            </h2>
            <Button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="h-9 gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              إضافة رابط
            </Button>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : list.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground mb-4">لا توجد إحالات بعد.</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة رابط
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right py-3.5 px-4 font-medium text-muted-foreground">الرمز</th>
                      <th className="text-right py-3.5 px-4 font-medium text-muted-foreground">الاسم</th>
                      <th className="text-right py-3.5 px-4 font-medium text-muted-foreground">صلاحية الكوكي</th>
                      <th className="text-right py-3.5 px-4 font-medium text-muted-foreground">عدد التبرعات</th>
                      <th className="text-right py-3.5 px-4 font-medium text-muted-foreground">التاريخ</th>
                      <th className="text-center py-3.5 px-4 font-medium text-muted-foreground w-[1%]">تحليل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2 px-4 font-mono font-medium">
                          {r.code}
                        </td>
                        <td className="py-2 px-4 text-foreground">
                          {r.name || "—"}
                        </td>
                        <td className="py-2 px-4 text-muted-foreground">
                          {(r.cookieExpiryDays ?? 30) === 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Infinity className="w-3.5 h-3.5" />
                              غير محدود
                            </span>
                          ) : (
                            `${r.cookieExpiryDays ?? 30} يوم`
                          )}
                        </td>
                        <td className="py-2 px-4 font-medium tabular-nums">
                          {r.donationsCount}
                        </td>
                        <td className="py-2 px-4 text-muted-foreground tabular-nums">
                          {new Date(r.createdAt).toLocaleDateString("ar-EG", {
                            dateStyle: "medium",
                          })}
                        </td>
                        <td className="py-2 px-4 flex items-center justify-center">
                          <Link
                            href={`/dashboard/referrals/${r.id}`}
                            className={cn(
                              "w-max inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium",
                              "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            )}
                          >
                            <BarChart3 className="w-4 h-4" />
                            عرض التحليل
                          </Link>
                        </td>




                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hint below table */}
        {list.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            الرابط: أي صفحة + <code className="bg-muted px-1.5 py-0.5 rounded text-foreground/80">?ref=الرمز</code>
            {" — "}
            مثال: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground/80 dir-ltr" >{baseUrl}{localePrefix}/?ref=ahmed</code>
          </p>
        )}
      </div>

      {/* Add link dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">إضافة رابط تتبع</DialogTitle>
            <DialogDescription className="text-right">
              أنشئ رمز تتبع جديد. الرابط سيكون: أي صفحة + <code className="bg-muted px-1 rounded">?ref=الرمز</code>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4 py-2">
            <div className="space-y-2 text-right">
              <label className="text-sm font-medium text-foreground">
                رمز التتبع <span className="text-destructive">*</span>
              </label>
              <Input
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                className="h-10 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-sm font-medium text-foreground">
                الاسم (اختياري)
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-3 text-right">
              <label className="text-sm font-medium text-foreground block">
                مدة صلاحية الكوكي
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {!cookieUnlimited && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={3650}
                      value={cookieExpiryDays}
                      onChange={(e) => setCookieExpiryDays(Math.max(1, parseInt(e.target.value, 10) || 30))}
                      className="h-10 w-24 text-sm"
                      dir="ltr"
                    />
                    <span className="text-sm text-muted-foreground">يوم</span>
                  </div>
                )}
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cookieUnlimited}
                    onChange={(e) => setCookieUnlimited(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-muted-foreground">غير محدود</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                المدة التي يبقى فيها رابط التتبع في جهاز الزائر. الافتراضي 30 يوم.
              </p>
            </div>
            <DialogFooter className="gap-2 flex-row-reverse">
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "إنشاء"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
