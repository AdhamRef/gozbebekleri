'use client';
import { dt } from '@/lib/dashboard/i18n';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { errorMessage } from '@/lib/dashboard/client-error-message';
import { readImpactConfig, type LocalizedText } from '@/lib/impact/config';
import { ImpactCampaignForm, type ImpactFormValues } from '../../_components/ImpactCampaignForm';

export default function EditImpactCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<ImpactFormValues | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    setInitial(null);
    if (!/^[a-f0-9]{24}$/i.test(id)) { setLoadError(dt('العنصر غير موجود')); return; }

    axios
      .get(`/api/impact/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const config = readImpactConfig(data);
        setInitial({
          slug: data.slug,
          title: (data.title ?? {}) as LocalizedText,
          intro: (data.intro ?? {}) as LocalizedText,
          isActive: data.isActive,
          allowMonthly: data.allowMonthly,
          regions: config.regions,
          needs: config.needs,
        });
      })
      .catch((e) => { if (active) setLoadError(errorMessage(e, dt('تعذّر التحميل'))); });
    return () => { active = false; };
  }, [id, reload]);

  if (loadError) return <div role="alert" className="space-y-4 p-6">
    <p>{loadError}</p>
    <button className="rounded border px-4 py-2" onClick={() => setReload((n) => n + 1)}>{dt("إعادة المحاولة")}</button>{' '}
    <a className="underline" href="/dashboard/impact">{dt("العودة إلى الحملات")}</a>
  </div>;

  if (!initial) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return <ImpactCampaignForm initial={initial} impactId={id} />;
}
