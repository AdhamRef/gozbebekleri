'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { errorMessage } from '@/lib/dashboard/client-error-message';
import { readImpactConfig, type LocalizedText } from '@/lib/impact/config';
import { ImpactCampaignForm, type ImpactFormValues } from '../../_components/ImpactCampaignForm';

export default function EditImpactCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<ImpactFormValues | null>(null);

  useEffect(() => {
    axios
      .get(`/api/impact/${id}`)
      .then(({ data }) => {
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
      .catch((e) => toast.error(errorMessage(e, 'تعذّر التحميل')));
  }, [id]);

  if (!initial) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return <ImpactCampaignForm initial={initial} impactId={id} />;
}
