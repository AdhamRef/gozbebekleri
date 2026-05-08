"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Dialog, DialogOverlay, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { VARIABLE_CATALOG, mergeText } from "@/lib/templates/variables";

interface Props {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAMPLE_CTX = (() => {
  const flat: Record<string, string> = {};
  for (const g of VARIABLE_CATALOG) {
    for (const e of g.entries) {
      flat[e.token.replace(/[{}]/g, "").trim()] = e.exampleValue;
    }
  }
  const get = (k: string) => flat[k] ?? "";
  return {
    user: {
      id: "sample",
      name: get("user.name"),
      email: get("user.email"),
      phone: get("user.phone"),
      countryName: get("user.countryName"),
      countryCode: get("user.countryCode"),
      city: get("user.city"),
      region: "",
      preferredLang: get("user.preferredLang"),
    },
    donations: [
      {
        id: "sample-1",
        amount: get("amount"),
        amountUSD: get("amountUSD"),
        currency: get("currency"),
        totalAmount: get("amount"),
        status: "PAID",
        createdAt: get("createdAt"),
        campaignTitle: get("campaignTitle"),
        itemCount: "1",
        items: [
          {
            campaignTitle: get("campaignTitle"),
            amount: get("amount"),
            amountUSD: get("amountUSD"),
            currency: get("currency"),
            shareCount: "",
          },
        ],
      },
    ],
    totals: {
      count: get("totals.count"),
      amountUSD: get("totals.amountUSD"),
      lastAt: get("totals.lastAt"),
    },
    donation: {
      id: "sample-1",
      amount: get("amount"),
      amountUSD: get("amountUSD"),
      currency: get("currency"),
      totalAmount: get("amount"),
      status: "PAID",
      createdAt: get("createdAt"),
      campaignTitle: get("campaignTitle"),
      itemCount: "2",
      items: [
        {
          campaignTitle: get("campaignTitle"),
          amount: "25",
          amountUSD: "25",
          currency: get("currency"),
          shareCount: "",
        },
        {
          campaignTitle: "حملة الشتاء",
          amount: "25",
          amountUSD: "25",
          currency: get("currency"),
          shareCount: "",
        },
      ],
    },
  };
})();

export function WhatsappTemplateEditorDialog({ id, open, onOpenChange }: Props) {
  const [name, setName] = React.useState("");
  const [body, setBody] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!id) {
      setName("");
      setBody("مرحباً {{user.name}}، شكراً لتبرّعك!");
      return;
    }
    setLoading(true);
    axios
      .get(`/api/templates/whatsapp/${id}`)
      .then((res) => {
        const t = res.data?.template;
        setName(t?.name ?? "");
        setBody(t?.body ?? "");
      })
      .catch(() => toast.error("فشل تحميل القالب"))
      .finally(() => setLoading(false));
  }, [id, open]);

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("الاسم والمحتوى مطلوبان");
      return;
    }
    setSaving(true);
    try {
      if (id) {
        await axios.patch(`/api/templates/whatsapp/${id}`, { name, body });
      } else {
        await axios.post("/api/templates/whatsapp", { name, body });
      }
      toast.success("تم الحفظ");
      onOpenChange(false);
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const preview = React.useMemo(() => mergeText(body, SAMPLE_CTX), [body]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent
        className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-6 transform -translate-x-1/2 -translate-y-1/2 border border-border rounded-xl shadow-xl bg-card"
        dir="rtl"
      >
        <DialogTitle className="text-lg font-bold mb-4">
          {id ? "تعديل قالب الواتساب" : "قالب واتساب جديد"}
        </DialogTitle>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin me-2" /> جاري التحميل…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">اسم القالب</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شكر التبرع"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">المحتوى</label>
                <Textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                  placeholder="اكتب رسالة الواتساب هنا"
                />
                <div className="rounded-md border border-border bg-slate-50/60 p-2 max-h-44 overflow-y-auto space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500">المتغيّرات المتاحة (اضغط للإدراج)</p>
                  {VARIABLE_CATALOG.map((g) => (
                    <div key={g.group}>
                      <div className="text-[10px] font-semibold text-slate-500 mb-1">{g.group}</div>
                      <div className="flex flex-wrap gap-1">
                        {g.entries.map((e) => (
                          <button
                            key={e.token}
                            type="button"
                            onClick={() => insertToken(e.token)}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-border hover:bg-blue-50"
                            title={e.label}
                          >
                            {e.token}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">معاينة (ببيانات تجريبية)</label>
                <div className="rounded-lg border border-border bg-[#E5DDD5] p-4 min-h-[260px]">
                  <div className="bg-white rounded-lg p-3 shadow-sm whitespace-pre-wrap text-sm" dir="rtl">
                    {preview || (
                      <span className="text-muted-foreground italic">المعاينة ستظهر هنا</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button onClick={save} disabled={saving} className="bg-[#25D366] hover:bg-[#25D366]/90">
                {saving && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                حفظ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
