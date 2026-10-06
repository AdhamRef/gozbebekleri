'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/dashboard/client-error-message';
import { validateImageFile } from '@/lib/uploads/image-file-rules';
import { LOCALE_OPTIONS } from '@/lib/locales';
import {
  IMPACT_STATE_KEYS,
  IMPACT_STATE_NEED_KEYS,
  type ImpactNeed,
  type ImpactRegion,
  type LocalizedText,
} from '@/lib/impact/config';

export type ImpactFormValues = {
  slug: string;
  title: LocalizedText;
  intro: LocalizedText;
  isActive: boolean;
  allowMonthly: boolean;
  regions: ImpactRegion[];
  needs: ImpactNeed[];
};

const STATE_LABELS: Record<string, string> = {
  base: 'الأساس (بدون اختيار)',
  carrying: 'ملابس + تعليم + غذاء',
  schooled: 'ملابس + تعليم',
  bagged_fed: 'تعليم + غذاء',
  dressed_fed: 'ملابس + غذاء',
  dressed: 'ملابس',
  bagged: 'تعليم',
  fed: 'غذاء',
};

const PRIMARY_LOCALES = ['ar', 'en', 'tr'];

function LocalizedField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: LocalizedText;
  onChange: (v: LocalizedText) => void;
  multiline?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const locales = LOCALE_OPTIONS.filter((l) => showAll || PRIMARY_LOCALES.includes(l.code));
  const Field = multiline ? Textarea : Input;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button type="button" className="text-xs text-primary inline-flex items-center gap-1" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'لغات أقل' : 'كل اللغات'}
          <ChevronDown className={`h-3 w-3 transition ${showAll ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {locales.map((l) => (
          <div key={l.code} className="space-y-1">
            <span className="text-[11px] text-muted-foreground">
              {l.label}
              {l.code === 'ar' && ' *'}
            </span>
            <Field
              dir={l.code === 'ar' ? 'rtl' : 'ltr'}
              value={value[l.code] ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                onChange({ ...value, [l.code]: e.target.value })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rejection = validateImageFile(file);
    if (rejection) {
      toast.error(rejection);
      e.target.value = '';
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post('/api/upload', fd);
      onChange(res.data.url);
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error(errorMessage(err, 'فشل الرفع'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  return (
    <div className="flex items-center gap-2">
      <div className="h-14 w-12 flex-none overflow-hidden rounded border bg-muted/40">
        {value && <img src={value} alt="" className="h-full w-full object-contain" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <div className="flex gap-1">
          <Input dir="ltr" className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} placeholder="/impact/... أو رابط" />
          <Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
        </div>
      </div>
    </div>
  );
}

function moveItem<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function ImpactCampaignForm({ initial, impactId }: { initial: ImpactFormValues; impactId?: string }) {
  const router = useRouter();
  const [v, setV] = useState<ImpactFormValues>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ImpactFormValues>(k: K, val: ImpactFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const setRegion = (i: number, patch: Partial<ImpactRegion>) =>
    set('regions', v.regions.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setNeed = (i: number, patch: Partial<ImpactNeed>) =>
    set('needs', v.needs.map((n, j) => (j === i ? { ...n, ...patch } : n)));

  const save = async () => {
    setSaving(true);
    try {
      if (impactId) {
        await axios.put(`/api/impact/${impactId}`, v);
        toast.success('تم الحفظ');
      } else {
        await axios.post('/api/impact', v);
        toast.success('تم إنشاء الحملة');
      }
      router.push('/dashboard/impact');
    } catch (e) {
      toast.error(errorMessage(e, 'تعذّر الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{impactId ? 'تعديل حملة "اصنع أثرًا"' : 'حملة "اصنع أثرًا" جديدة'}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/impact')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> العودة
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الإعدادات العامة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-1">
              <Label>الرابط (slug)</Label>
              <Input dir="ltr" value={v.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="make-an-impact" />
              <p className="text-[11px] text-muted-foreground" dir="ltr">/ar/impact/{v.slug || '…'}</p>
            </div>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Switch checked={v.isActive} onCheckedChange={(c) => set('isActive', c)} />
              <span className="text-sm">
                <strong className="block">مفعّلة</strong>
                <span className="text-muted-foreground text-xs">تظهر للزوار وتستقبل التبرعات</span>
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <Switch checked={v.allowMonthly} onCheckedChange={(c) => set('allowMonthly', c)} />
              <span className="text-sm">
                <strong className="block">السماح بالتبرع الشهري</strong>
                <span className="text-muted-foreground text-xs">يظهر خيار &quot;اجعل هذا التبرع شهريًا&quot;</span>
              </span>
            </label>
          </div>
          <LocalizedField label="العنوان" value={v.title} onChange={(t) => set('title', t)} />
          <LocalizedField label="النص التعريفي" value={v.intro} onChange={(t) => set('intro', t)} multiline />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الاحتياجات</CardTitle>
          <CardDescription>
            الأسعار بالدولار وتُحوَّل تلقائيًا لعملة المتبرع. الاحتياجات ذات المفاتيح{' '}
            <code dir="ltr">{IMPACT_STATE_NEED_KEYS.join(', ')}</code> تغيّر صورة الطفل؛ نوع &quot;عنصر على المسرح&quot; تظهر
            أيقونته بجانب الطفل.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {v.needs.map((n, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-32 space-y-1">
                  <Label className="text-xs">المفتاح</Label>
                  <Input dir="ltr" value={n.key} onChange={(e) => setNeed(i, { key: e.target.value.toLowerCase() })} />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">السعر (USD)</Label>
                  <Input dir="ltr" type="number" min={0} step="0.01" value={n.priceUSD} onChange={(e) => setNeed(i, { priceUSD: Number(e.target.value) })} />
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">أقصى كمية</Label>
                  <Input dir="ltr" type="number" min={1} value={n.maxQuantity} onChange={(e) => setNeed(i, { maxQuantity: Number(e.target.value) })} />
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">النوع</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    value={n.kind === 'prop' ? `prop-${n.placement ?? 'ground'}` : 'state'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNeed(i, val === 'state' ? { kind: 'state', placement: undefined } : { kind: 'prop', placement: val === 'prop-background' ? 'background' : 'ground' });
                    }}
                  >
                    <option value="state">يغيّر صورة الطفل</option>
                    <option value="prop-ground">عنصر على المسرح</option>
                    <option value="prop-background">خلفية المسرح</option>
                  </select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">الأولوية</Label>
                  <Input dir="ltr" type="number" value={n.priority} onChange={(e) => setNeed(i, { priority: Number(e.target.value) })} />
                </div>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <Switch checked={n.active} onCheckedChange={(c) => setNeed(i, { active: c })} /> مفعّل
                </label>
                <div className="ms-auto flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => set('needs', moveItem(v.needs, i, -1))}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => set('needs', moveItem(v.needs, i, 1))}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => set('needs', v.needs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <LocalizedField label="الاسم" value={n.name} onChange={(name) => setNeed(i, { name })} />
              <div className="max-w-md">
                <ImageField label="الأيقونة" value={n.icon} onChange={(icon) => setNeed(i, { icon })} />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() =>
              set('needs', [
                ...v.needs,
                { key: '', name: {}, kind: 'prop', placement: 'ground', priceUSD: 5, icon: '', priority: 5, maxQuantity: 10, active: true },
              ])
            }
          >
            <Plus className="h-4 w-4" /> إضافة احتياج
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المناطق وصور الشخصيات</CardTitle>
          <CardDescription>
            لكل منطقة صورة أساس وصور لكل حالة (1600×2000، WebP شفاف، بنفس موضع الطفل). الحالة الناقصة تعرض صورة الأساس.
            المنطقة غير المفعّلة تظهر بعلامة &quot;قريبًا&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {v.regions.map((r, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-32 space-y-1">
                  <Label className="text-xs">المفتاح</Label>
                  <Input dir="ltr" value={r.key} onChange={(e) => setRegion(i, { key: e.target.value.toLowerCase() })} />
                </div>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <Switch checked={r.active} onCheckedChange={(c) => setRegion(i, { active: c })} /> مفعّلة
                </label>
                <div className="ms-auto flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => set('regions', moveItem(v.regions, i, -1))}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => set('regions', moveItem(v.regions, i, 1))}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => set('regions', v.regions.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <LocalizedField label="الاسم" value={r.name} onChange={(name) => setRegion(i, { name })} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(['base', ...IMPACT_STATE_KEYS] as const).map((k) => (
                  <ImageField
                    key={k}
                    label={STATE_LABELS[k]}
                    value={r.images[k] ?? ''}
                    onChange={(url) => setRegion(i, { images: { ...r.images, [k]: url } })}
                  />
                ))}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => set('regions', [...v.regions, { key: '', name: {}, active: false, images: { base: '' } }])}
          >
            <Plus className="h-4 w-4" /> إضافة منطقة
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
        </Button>
      </div>
    </div>
  );
}
