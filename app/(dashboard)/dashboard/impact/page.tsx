'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { BarChart3, ExternalLink, HeartHandshake, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { errorMessage } from '@/lib/dashboard/client-error-message';
import { pickText, type LocalizedText } from '@/lib/impact/config';

interface Row {
  id: string;
  slug: string;
  title: LocalizedText;
  isActive: boolean;
  allowMonthly: boolean;
  createdAt: string;
  campaign: { id: string; currentAmount: number };
  _count: { lines: number };
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export default function ImpactCampaignsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    axios
      .get<Row[]>('/api/impact')
      .then((res) => setRows(res.data))
      .catch((e) => toast.error(errorMessage(e, 'تعذّر تحميل القائمة')))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (row: Row) => {
    setTogglingId(row.id);
    try {
      await axios.put(`/api/impact/${row.id}`, { isActive: !row.isActive });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isActive: !r.isActive } : r)));
    } catch (e) {
      toast.error(errorMessage(e, 'فشل التحديث'));
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/impact/${deleteTarget.id}`);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('تم الحذف');
      setDeleteTarget(null);
    } catch (e) {
      toast.error(errorMessage(e, 'فشل الحذف'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">اصنع أثرًا لطفل</h1>
          <p className="text-muted-foreground mt-1">
            حملات تفاعلية يختار فيها المتبرع احتياجات الطفل حسب المنطقة وتتغيّر صورة الطفل مع كل اختيار
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/impact/new')} size="lg" className="gap-2">
          <Plus className="w-5 h-5" /> حملة جديدة
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[200px]">الحملة</TableHead>
                <TableHead className="w-32 text-center">المُحصّل</TableHead>
                <TableHead className="w-32 text-center">الاحتياجات المختارة</TableHead>
                <TableHead className="w-28 text-center">الحالة</TableHead>
                <TableHead className="w-64 text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-semibold">{pickText(r.title, 'ar')}</div>
                    <a
                      href={`/ar/impact/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      dir="ltr"
                    >
                      /impact/{r.slug} <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">{usd(r.campaign.currentAmount)}</TableCell>
                  <TableCell className="text-center tabular-nums">{r._count.lines}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Switch checked={r.isActive} onCheckedChange={() => toggle(r)} disabled={togglingId === r.id} />
                      {togglingId === r.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push(`/dashboard/impact/${r.id}`)}>
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">التقرير</span>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push(`/dashboard/impact/edit/${r.id}`)}>
                        <Pencil className="w-4 h-4" />
                        <span className="hidden sm:inline">تعديل</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {rows.length === 0 && (
          <EmptyState
            variant="inline"
            icon={HeartHandshake}
            title="لا توجد حملات بعد"
            description="أنشئ أول حملة — يُملأ النموذج تلقائيًا بالمناطق الخمس والاحتياجات الثمانية وصور الشخصيات الجاهزة."
            action={
              <Button onClick={() => router.push('/dashboard/impact/new')} className="gap-2 bg-brand hover:bg-brand-dark">
                <Plus className="w-4 h-4" /> حملة جديدة
              </Button>
            }
          />
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحملة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف &quot;{deleteTarget ? pickText(deleteTarget.title, 'ar') : ''}&quot; نهائيًا. الحملات التي استقبلت
              تبرعات لا يمكن حذفها — أوقفها بدلًا من ذلك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
