"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Dialog, DialogOverlay, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { EVENT_CATALOG, DEFAULT_COOLDOWN_DAYS, DEFAULT_LAPSE_DAYS } from "@/lib/events/catalog";
import type { MessageTriggerEvent } from "@/lib/events/dispatch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TemplateRow {
  id: string;
  name: string;
}

export function TriggerEditorDialog({ open, onOpenChange }: Props) {
  const [event, setEvent] = React.useState<MessageTriggerEvent | "">("");
  const [channel, setChannel] = React.useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [templateId, setTemplateId] = React.useState<string>("");
  const [emailTemplates, setEmailTemplates] = React.useState<TemplateRow[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = React.useState<TemplateRow[]>([]);
  const [lapseDays, setLapseDays] = React.useState(String(DEFAULT_LAPSE_DAYS));
  const [cooldownDays, setCooldownDays] = React.useState(String(DEFAULT_COOLDOWN_DAYS));
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEvent("");
    setChannel("EMAIL");
    setTemplateId("");
    setLapseDays(String(DEFAULT_LAPSE_DAYS));
    setCooldownDays(String(DEFAULT_COOLDOWN_DAYS));

    setLoading(true);
    Promise.all([
      axios.get("/api/templates/email").then((res) => res.data?.templates ?? []),
      axios.get("/api/templates/whatsapp").then((res) => res.data?.templates ?? []),
    ])
      .then(([emails, wa]) => {
        setEmailTemplates(emails);
        setWhatsappTemplates(wa);
      })
      .catch(() => toast.error("فشل تحميل القوالب"))
      .finally(() => setLoading(false));
  }, [open]);

  React.useEffect(() => {
    setTemplateId("");
  }, [channel]);

  const eventDef = event ? EVENT_CATALOG.find((e) => e.event === event) : null;
  const templates = channel === "EMAIL" ? emailTemplates : whatsappTemplates;
  const isScheduled = eventDef?.scheduled === true;
  const lapseValue = Number(lapseDays);
  const cooldownValue = Number(cooldownDays);
  const timingValid =
    !isScheduled ||
    (Number.isInteger(lapseValue) && lapseValue >= 1 && Number.isInteger(cooldownValue) && cooldownValue >= 1);

  const save = async () => {
    if (!event || !templateId) {
      toast.error("اختر الحدث والقالب");
      return;
    }
    if (!timingValid) {
      toast.error("أدخل عدد أيام صحيح");
      return;
    }
    setSaving(true);
    try {
      await axios.post("/api/templates/triggers", {
        event,
        channel,
        templateId,
        ...(isScheduled ? { lapseDays: lapseValue, cooldownDays: cooldownValue } : {}),
      });
      toast.success("تم إضافة الحدث");
      onOpenChange(false);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent
        className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-xl max-h-[90vh] overflow-y-auto p-6 transform -translate-x-1/2 -translate-y-1/2 border border-border rounded-xl shadow-xl bg-card"
        dir="rtl"
      >
        <DialogTitle className="text-lg font-bold mb-1">حدث تلقائي جديد</DialogTitle>
        <p className="text-sm text-muted-foreground mb-4">
          اربط حدثًا في النظام بقالب موجود — سيُرسل القالب تلقائيًا للمتبرع المعني عند وقوع الحدث.
        </p>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin me-2" /> جاري التحميل…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">الحدث</label>
              <Select value={event} onValueChange={(v) => setEvent(v as MessageTriggerEvent)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الحدث" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATALOG.map((e) => (
                    <SelectItem key={e.event} value={e.event}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eventDef && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {eventDef.description}
                  {eventDef.hasDonation && (
                    <span className="block mt-0.5 text-[#025EB8]">
                      ✓ متاح لهذا الحدث متغيّرات{" "}
                      <code className="font-mono">{"{{donation.*}}"}</code> و{" "}
                      <code className="font-mono">{"{{#donation.items}}"}</code>
                    </span>
                  )}
                </p>
              )}
            </div>

            {isScheduled && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  هذا حدث مجدول — يُفحص يوميًا بدل أن يُطلق فورًا. يُرسل للمتبرّع الذي مضى على آخر تبرّع ناجح له المدة أدناه.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">يُرسل بعد (يوم من آخر تبرّع)</label>
                    <Input
                      type="number"
                      min={1}
                      max={3650}
                      value={lapseDays}
                      onChange={(e) => setLapseDays(e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">لا يتكرّر قبل (يوم)</label>
                    <Input
                      type="number"
                      min={1}
                      max={3650}
                      value={cooldownDays}
                      onChange={(e) => setCooldownDays(e.target.value)}
                      className="text-right"
                    />
                  </div>
                </div>
                {!timingValid && (
                  <p className="text-[11px] text-red-600">أدخل عددًا صحيحًا لا يقل عن ١ في الحقلين.</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">القناة</label>
              <Select
                value={channel}
                onValueChange={(v) => setChannel(v as "EMAIL" | "WHATSAPP")}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">بريد إلكتروني</SelectItem>
                  <SelectItem value="WHATSAPP">واتساب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">القالب</label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      templates.length === 0
                        ? "لا توجد قوالب — أنشئ قالبًا من تبويبة البريد/الواتساب"
                        : "اختر قالبًا"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button
                onClick={save}
                disabled={saving || !event || !templateId || !timingValid}
                className="bg-[#025EB8] hover:bg-[#025EB8]/90"
              >
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
