import { FileText, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { operationsContentProgress } from "@/lib/operations/content-progress";
import { operationsContentTypeLabel, operationsStatusLabel } from "@/lib/operations/display-labels";
import type { OperationsOverview } from "@/lib/operations/types";
import { OperationsContentPlanFoundationActions } from "./OperationsContentPlanFoundationActions";
import { OperationsContentPlanTaskAction } from "./OperationsContentPlanTaskAction";

type Props = {
  plans: OperationsOverview["plans"];
  items: OperationsOverview["items"];
  statusClass: Record<string, string>;
};

function progressValue(total: number, done: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function contentLinks(item: OperationsOverview["items"][number]) {
  return [
    item.figmaUrl ? ["Figma", item.figmaUrl] : null,
    item.driveUrl ? ["Drive", item.driveUrl] : null,
    item.videoUrl ? ["Video", item.videoUrl] : null,
    item.finalAssetUrl ? ["Final", item.finalAssetUrl] : null,
  ].filter(Boolean) as string[][];
}

export function OperationsContentPlans({ plans, items, statusClass }: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#025EB8]" /> خطط المحتوى</CardTitle>
          <CardDescription>تابع أهداف كل خطة، عدد المواد المطلوبة، وما تم إنجازه حتى الآن.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.map((plan) => {
            const progress = progressValue(plan.items, plan.published);
            return (
              <div key={plan.id || plan.title} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black text-slate-900">{plan.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{plan.theme}</p>
                  </div>
                  <Badge variant="outline" className={statusClass[plan.status]}>{operationsStatusLabel(plan.status)}</Badge>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  <span>العناصر: <b>{plan.items}</b></span>
                  <span>المنجز: <b>{plan.published}</b></span>
                  <span>الفترة: <b>{plan.date}</b></span>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>نسبة الإنجاز</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <OperationsContentPlanTaskAction plan={plan} />
                <OperationsContentPlanFoundationActions plan={plan} />
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#025EB8]" /> عناصر المحتوى</CardTitle>
          <CardDescription>قائمة مختصرة بأهم عناصر المحتوى المرتبطة بالإنتاج.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => {
            const links = contentLinks(item);
            const progress = operationsContentProgress(item);
            return (
              <div key={item.id || item.title} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <Badge variant="outline" className={statusClass[item.status]}>{operationsStatusLabel(item.status)}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <span>النوع: <b>{operationsContentTypeLabel(item.type)}</b></span>
                  <span>القناة: <b>{item.channel}</b></span>
                  <span>الموعد: <b>{item.due || "غير محدد"}</b></span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>تقدم العنصر</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {links.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {links.map(([label, href]) => (
                      <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-bold text-[#025EB8] hover:border-[#025EB8]">
                        {label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
