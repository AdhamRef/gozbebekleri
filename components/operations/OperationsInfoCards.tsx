import { CheckCircle2, Clock3, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OperationsInfoCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> قاعدة العمل
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-700">
          كل عنصر محتوى يتم تسجيله يدويًا ومراجعته قبل النشر أو التسويق. لا يوجد نشر أو إرسال تلقائي من هذه اللوحة.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand" /> التسليم للتسويق
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-700">
          العناصر المعتمدة ستكون جاهزة للربط بروابط الحملات ونتائج الإعلانات في مرحلة التسويق.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-amber-600" /> الخطوة القادمة
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-700">
          سنضيف متابعة أوضح للمسؤوليات، سجل التغييرات، وجدولة النشر اليدوي لكل منصة.
        </CardContent>
      </Card>
    </div>
  );
}
