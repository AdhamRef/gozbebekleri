import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { operationsContentTypeLabel } from "@/lib/operations/display-labels";
import type { OperationsOverview } from "@/lib/operations/types";
import { OperationsContentItemActions } from "./OperationsContentItemActions";

type BoardColumn = readonly [status: string, label: string, description: string];

type OperationsContentKanbanProps = {
  items: OperationsOverview["items"];
  boardColumns: readonly BoardColumn[];
  statusClass: Record<string, string>;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric", year: "numeric" });
}

function productionIndicator(status: string) {
  if (status === "IDEA") return "يحتاج نص";
  if (status === "WRITING") return "كتابة جارية";
  if (status === "DESIGN") return "يحتاج تصميم";
  if (status === "REVIEW") return "يحتاج مراجعة";
  if (status === "APPROVED") return "جاهز للتسويق";
  if (status === "SCHEDULED") return "مجدول";
  if (status === "PUBLISHED") return "منشور يدويًا";
  return "قيد المتابعة";
}

function assetLinks(item: OperationsOverview["items"][number]) {
  return [
    item.figmaUrl ? ["Figma", item.figmaUrl] : null,
    item.driveUrl ? ["Drive", item.driveUrl] : null,
    item.videoUrl ? ["Video", item.videoUrl] : null,
    item.finalAssetUrl ? ["Final", item.finalAssetUrl] : null,
  ].filter(Boolean) as string[][];
}

export function OperationsContentKanban({ items, boardColumns, statusClass }: OperationsContentKanbanProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>مراحل إنتاج المحتوى</CardTitle>
        <CardDescription>تابع انتقال كل عنصر محتوى من الفكرة إلى المراجعة والاعتماد والجدولة والنشر اليدوي.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
          {boardColumns.map(([status, label, description]) => {
            const columnItems = items.filter((item) => item.status === status);

            return (
              <div key={status} className="rounded-2xl border bg-slate-50 p-3">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-900">{label}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                  </div>
                  <Badge variant="outline" className={statusClass[status]}>{columnItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {columnItems.map((item) => {
                    const lastPublishedAt = formatDate(item.lastPublishedAt);
                    const links = assetLinks(item);
                    return (
                      <div key={item.id || item.title} className="rounded-xl border bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold leading-6 text-slate-900">{item.title}</h4>
                          <Badge variant="outline" className={statusClass[item.status]}>{operationsContentTypeLabel(item.type)}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">{productionIndicator(item.status)}</span>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <p>القناة: <b>{item.channel}</b></p>
                          <p>الموعد: <b>{item.due}</b></p>
                          {item.publicationCount ? (
                            <p>النشر: <b>{item.publicationCount}</b> سجل · <b>{item.publishedPlatforms?.join(" / ") || "تسجيل يدوي"}</b>{lastPublishedAt ? ` · ${lastPublishedAt}` : ""}</p>
                          ) : null}
                        </div>
                        {links.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {links.map(([label, href]) => (
                              <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-full border bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-[#025EB8] hover:border-[#025EB8]">
                                {label}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <OperationsContentItemActions id={item.id} status={item.status} />
                      </div>
                    );
                  })}
                  {columnItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed bg-white p-3 text-center text-xs text-slate-400">لا توجد عناصر حالية</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
