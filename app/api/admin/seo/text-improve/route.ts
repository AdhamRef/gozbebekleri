import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
/** Replaced by the record/revision-bound workflow; no truncated or generic fallback drafts. */
export async function POST(request:NextRequest) {
  const body=await request.json().catch(()=>null),type=body?.type;
  if(!["campaign","category","blog"].includes(type))return NextResponse.json({error:"نوع محتوى غير صالح"},{status:400});
  const session=await getServerSession(authOptions),denied=requireAdminOrDashboardPermission(session,type === "campaign" ? "campaigns" : type === "category" ? "categories" : "blog");
  if(denied)return denied;
  return NextResponse.json({error:"انتقل تحسين النص إلى مسار جودة المحتوى داخل محرر العنصر. احفظ العنصر وافتح محرره لاستخدام التدقيق والتحسين والتنسيق وSEO مع معاينة قبل الحفظ."},{status:409});
}
