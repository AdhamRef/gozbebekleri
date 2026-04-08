"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_SUGGESTED_SHARE_COUNTS,
  parseSuggestedShareCounts,
  type SuggestedShareCountsConfig,
} from "@/lib/campaign/campaign-modes";
import { parseAmountsInput } from "@/lib/campaign/suggested-donations";

export type SuggestedShareCountsSectionRef = {
  getPayload: () => { counts: number[] };
};

type Props = {
  initialConfig?: SuggestedShareCountsConfig | null;
};

export const SuggestedShareCountsSection = forwardRef<
  SuggestedShareCountsSectionRef,
  Props
>(function SuggestedShareCountsSection({ initialConfig }, ref) {
  const [countsStr, setCountsStr] = useState(
    () => DEFAULT_SUGGESTED_SHARE_COUNTS.join(", ")
  );

  const stableKey = useMemo(
    () => JSON.stringify(initialConfig ?? null),
    [initialConfig]
  );

  useEffect(() => {
    const p = parseSuggestedShareCounts(initialConfig);
    setCountsStr(p.counts.join(", "));
  }, [stableKey]);

  useImperativeHandle(ref, () => ({
    getPayload: () => {
      let counts = parseAmountsInput(countsStr.replace(/،/g, ","));
      counts = counts.map((n) => Math.floor(n)).filter((n) => n >= 1);
      counts = [...new Set(counts)].sort((a, b) => a - b);
      if (!counts.length) counts = [...DEFAULT_SUGGESTED_SHARE_COUNTS];
      if (counts.length > 12) counts = counts.slice(0, 12);
      return { counts };
    },
  }));

  return (
    <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/30">
      <Label className="text-sm font-medium">
        أعداد الأسهم المقترحة (سهوم) — مفصولة بفاصلة
      </Label>
      <Input
        value={countsStr}
        onChange={(e) => setCountsStr(e.target.value)}
        placeholder="1, 5, 10, 25, 50"
        dir="ltr"
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        تُعرض كأزرار سريعة عند اختيار التبرع بعدد الأسهم. الافتراضي:{" "}
        {DEFAULT_SUGGESTED_SHARE_COUNTS.join(", ")}
      </p>
    </div>
  );
});
