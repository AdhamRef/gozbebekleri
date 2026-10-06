'use client';

import { ImpactCampaignForm } from '../_components/ImpactCampaignForm';
import { DEFAULT_IMPACT_CONFIG, DEFAULT_IMPACT_INTRO, DEFAULT_IMPACT_TITLE } from '@/lib/impact/config';

export default function NewImpactCampaignPage() {
  return (
    <ImpactCampaignForm
      initial={{
        slug: 'make-an-impact',
        title: { ...DEFAULT_IMPACT_TITLE },
        intro: { ...DEFAULT_IMPACT_INTRO },
        isActive: true,
        allowMonthly: true,
        regions: structuredClone(DEFAULT_IMPACT_CONFIG.regions),
        needs: structuredClone(DEFAULT_IMPACT_CONFIG.needs),
      }}
    />
  );
}
