'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Loader2, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errorMessage } from '@/lib/dashboard/client-error-message';
import { pickText, readImpactConfig, type ImpactConfig, type LocalizedText } from '@/lib/impact/config';

type Stats = {
  raisedUSD: number;
  paidDonations: number;
  activeMonthly: number;
  monthlyPledgedUSD: number;
  breakdown: { regionKey: string; needKey: string; quantity: number; amountUSD: number }[];
  recent: {
    id: string;
    paidAt: string;
    amount: number;
    currency: string;
    subscriptionId: string | null;
    donor: { name: string | null; email: string | null } | null;
    impactLines: { regionKey: string; needKey: string; quantity: number }[];
  }[];
};

const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function ImpactCampaignReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [config, setConfig] = useState<ImpactConfig | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([axios.get(`/api/impact/${id}`), axios.get<Stats>(`/api/impact/${id}/stats`)])
      .then(([c, s]) => {
        setTitle(pickText(c.data.title as LocalizedText, 'ar'));
        setConfig(readImpactConfig(c.data));
        setStats(s.data);
      })
      .catch((e) => toast.error(errorMessage(e, 'تعذّر تحميل التقرير')));
  }, [id]);

  if (!stats || !config) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const regionName = (k: string) => pickText(config.regions.find((r) => r.key === k)?.name, 'ar') || k;
  const needName = (k: string) => pickText(config.needs.find((n) => n.key === k)?.name, 'ar') || k;

  const kpis = [
    { label: 'إجمالي المُحصّل', value: usd(stats.raisedUSD) },
    { label: 'تبرعات مدفوعة', value: stats.paidDonations.toLocaleString('en-US') },
    { label: 'اشتراكات شهرية نشطة', value: stats.activeMonthly.toLocaleString('en-US') },
    { label: 'التزام شهري', value: usd(stats.monthlyPledgedUSD) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">تقرير الاحتياجات المموّلة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/impact')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> العودة
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/impact/edit/${id}`)} className="gap-2">
            <Pencil className="w-4 h-4" /> تعديل
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الاحتياجات المموّلة حسب المنطقة</CardTitle>
          <p className="text-sm text-muted-foreground">
            التبرعات لمرة واحدة والدفعة الأولى من كل اشتراك شهري (التجديدات تظهر في إجمالي المُحصّل).
          </p>
        </CardHeader>
        <CardContent>
          {stats.breakdown.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">لا توجد تبرعات مدفوعة بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>المنطقة</TableHead>
                  <TableHead>الاحتياج</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-center">القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.breakdown.map((b) => (
                  <TableRow key={`${b.regionKey}|${b.needKey}`}>
                    <TableCell>{regionName(b.regionKey)}</TableCell>
                    <TableCell>{needName(b.needKey)}</TableCell>
                    <TableCell className="text-center tabular-nums">{b.quantity}</TableCell>
                    <TableCell className="text-center tabular-nums">{usd(b.amountUSD)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>آخر التبرعات</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">لا توجد تبرعات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>المتبرع</TableHead>
                  <TableHead>الاختيارات</TableHead>
                  <TableHead className="text-center">المبلغ</TableHead>
                  <TableHead className="text-center">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.donor?.name || '—'}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{d.donor?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {d.subscriptionId && <Badge>شهري</Badge>}
                        {d.impactLines.map((l) => (
                          <Badge key={`${l.regionKey}|${l.needKey}`} variant="outline">
                            {regionName(l.regionKey)} · {needName(l.needKey)} × {l.quantity}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums" dir="ltr">
                      {d.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {d.currency}
                    </TableCell>
                    <TableCell className="text-center text-sm" dir="ltr">
                      {new Date(d.paidAt).toLocaleDateString('en-GB')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
