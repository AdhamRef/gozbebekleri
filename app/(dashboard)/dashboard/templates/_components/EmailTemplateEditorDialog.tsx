"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Dialog, DialogOverlay, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { EmailDocument } from "@/components/email-builder";
import { defaultDocument } from "@/components/email-builder";

const EmailEditor = dynamic(
  () => import("@/components/email-builder").then((m) => m.EmailEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
        جاري تحميل المحرر…
      </div>
    ),
  }
);

interface Props {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailTemplateEditorDialog({ id, open, onOpenChange }: Props) {
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [doc, setDoc] = React.useState<EmailDocument>(() => defaultDocument());
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!id) {
      setName("");
      setSubject("");
      setDoc(defaultDocument());
      return;
    }
    setLoading(true);
    axios
      .get(`/api/templates/email/${id}`)
      .then((res) => {
        const t = res.data?.template;
        setName(t?.name ?? "");
        setSubject(t?.subject ?? "");
        setDoc((t?.document as EmailDocument) ?? defaultDocument());
      })
      .catch(() => toast.error("فشل تحميل القالب"))
      .finally(() => setLoading(false));
  }, [id, open]);

  const save = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("الاسم والموضوع مطلوبان");
      return;
    }
    setSaving(true);
    try {
      if (id) {
        await axios.patch(`/api/templates/email/${id}`, { name, subject, document: doc });
      } else {
        await axios.post("/api/templates/email", { name, subject, document: doc });
      }
      toast.success("تم الحفظ");
      onOpenChange(false);
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent
        className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-[1400px] h-[calc(100%-2rem)] max-h-[95vh] p-0 transform -translate-x-1/2 -translate-y-1/2 border border-border rounded-xl shadow-xl bg-card flex flex-col"
        dir="rtl"
      >
        <DialogTitle className="sr-only">
          {id ? "تعديل قالب البريد" : "قالب بريد جديد"}
        </DialogTitle>

        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex-1 grid grid-cols-2 gap-3 max-w-3xl">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">اسم القالب</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شكر التبرع الشهري"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">موضوع البريد</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مرحباً {{user.name}}"
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving} className="bg-[#025EB8] hover:bg-[#025EB8]/90">
              {saving && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              حفظ
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin me-2" /> جاري التحميل…
            </div>
          ) : (
            <EmailEditor value={doc} onChange={setDoc} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
