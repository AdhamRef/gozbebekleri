'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Edit, ExternalLink, Link2, Loader2, Search, Settings2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Campaign = {
  id: string;
  slug?: string | null;
  title: string;
  isActive: boolean;
  categories?: { id: string; name: string }[];
  category?: { id: string; name: string } | null;
};

export default function CampaignAdvancedToolsPage() {
  const locale = useLocale() as string;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/campaigns/all', {
          params: { locale: locale || 'ar', isActiveFalse: true },
        });
        setCampaigns(response.data?.items || response.data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [locale]);

  const filteredCampaigns = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return campaigns;
    return campaigns.filter((campaign) => {
      const categories = campaign.categories ?? (campaign.category ? [campaign.category] : []);
      const categoryText = categories.map((category) => category.name).join(' ').toLowerCase();
      return campaign.title.toLowerCase().includes(search) || categoryText.includes(search);
    });
  }, [campaigns, query]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-[#025EB8]" />
            <h1 className="text-2xl font-bold text-gray-900">أدوات المشاريع المتقدمة</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            وصول سريع لإدارة روابط اللغات وSEO لكل مشروع بدون الدخول في تفاصيل النموذج الكامل.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/campaigns">العودة إلى المشاريع</Link>
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم المشروع أو الحملة..."
            className="pr-10"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المشروع</TableHead>
                <TableHead className="text-right">الحملة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-center">الإجراءات المتقدمة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جار تحميل المشاريع...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                    لا توجد مشاريع مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const categories = campaign.categories ?? (campaign.category ? [campaign.category] : []);
                  const publicSlug = campaign.slug || campaign.id;
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.title}</TableCell>
                      <TableCell>{categories.map((category) => category.name).join(' • ') || '—'}</TableCell>
                      <TableCell>
                        <span className={campaign.isActive ? 'text-emerald-700' : 'text-amber-700'}>
                          {campaign.isActive ? 'نشط' : 'مؤرشف'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button size="sm" variant="outline" asChild className="gap-1.5">
                            <Link href={`/dashboard/campaigns/edit/${campaign.id}`}>
                              <Edit className="h-3.5 w-3.5" />
                              تعديل
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild className="gap-1.5">
                            <Link href={`/dashboard/campaigns/${campaign.id}/links`}>
                              <Link2 className="h-3.5 w-3.5" />
                              روابط اللغات
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild className="gap-1.5">
                            <Link href={`/dashboard/campaigns/${campaign.id}/seo`}>
                              <Search className="h-3.5 w-3.5" />
                              SEO
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild className="gap-1.5">
                            <Link href={`/${locale || 'ar'}/campaign/${publicSlug}`} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                              عرض
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
