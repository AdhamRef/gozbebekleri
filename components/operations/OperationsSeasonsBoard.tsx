import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationsOverview } from "@/lib/operations/types";
import { OperationsFoundationItemActions } from "./OperationsFoundationItemActions";
import { OperationsSeasonCreateAction } from "./OperationsSeasonCreateAction";
import { OperationsSeasonTaskAction } from "./OperationsSeasonTaskAction";
import { OperationsWeeklyThemeCreateAction } from "./OperationsWeeklyThemeCreateAction";
import { OperationsWeeklyThemeTaskAction } from "./OperationsWeeklyThemeTaskAction";

type OperationsSeasonsBoardProps = {
  seasons: OperationsOverview["seasons"];
  weeklyThemes: OperationsOverview["weeklyThemes"];
  statusClass: Record<string, string>;
};

const seasonStatusOptions = [
  ["PLANNING", "تخطيط"],
  ["ACTIVE", "نشط"],
  ["UPCOMING", "قادم"],
  ["DONE", "منتهي"],
] as const;

const seasonFields = [
  { key: "title", label: "اسم الموسم" },
  { key: "focus", label: "التركيز" },
  { key: "status", label: "الحالة", type: "select", options: seasonStatusOptions },
  { key: "period", label: "الفترة" },
  { key: "required", label: "المطلوب", type: "number" },
  { key: "ready", label: "الجاهز", type: "number" },
  { key: "progress", label: "نسبة الإنجاز", type: "number" },
] as const;

const weeklyThemeFields = [
  { key: "week", label: "الأسبوع" },
  { key: "theme", label: "المحور" },
  { key: "description", label: "الوصف" },
] as const;

export function OperationsSeasonsBoard({ seasons, weeklyThemes, statusClass }: OperationsSeasonsBoardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#025EB8]" /> التقويم التشغيلي والمواسم
        </CardTitle>
        <CardDescription>نظرة واحدة على المواسم والمحاور التي تقود إنتاج المحتوى، مع إمكانية تحويل كل موسم أو محور أسبوعي إلى مهمة محفوظة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OperationsSeasonCreateAction />
        <div className="grid gap-3 xl:grid-cols-5">
          {seasons.map((season) => (
            <div key={season.id || season.title} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">{season.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{season.focus}</p>
                </div>
                <Badge variant="outline" className={statusClass[season.status]}>{season.status}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <p>الفترة: <b>{season.period}</b></p>
                <p>المواد: <b>{season.ready}</b> جاهزة من <b>{season.required}</b></p>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${season.progress}%` }} />
                </div>
                <p className="text-left font-bold text-slate-700">{season.progress}%</p>
              </div>
              <OperationsSeasonTaskAction season={season} />
              <OperationsFoundationItemActions collection="seasons" item={season} fields={seasonFields} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="font-black text-slate-900">خطة المحاور الشهرية</h3>
            <OperationsWeeklyThemeCreateAction />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {weeklyThemes.map((theme) => (
              <div key={theme.id || theme.week} className="rounded-xl border bg-slate-50 p-3">
                <p className="text-xs font-bold text-[#025EB8]">{theme.week}</p>
                <h4 className="mt-1 font-black text-slate-900">{theme.theme}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">{theme.description}</p>
                <OperationsWeeklyThemeTaskAction theme={theme} />
                <OperationsFoundationItemActions collection="weeklyThemes" item={theme} fields={weeklyThemeFields} compact />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
