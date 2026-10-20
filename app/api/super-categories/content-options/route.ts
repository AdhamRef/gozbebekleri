import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
 const session = await getServerSession(authOptions), denied = requireAdminOrDashboardPermission(session, "siteContent"); if (denied) return denied;
 const [campaigns, posts] = await Promise.all([prisma.campaign.findMany({ select: { id: true, title: true, isActive: true } }), prisma.post.findMany({ select: { id: true, title: true, published: true } })]);
 return NextResponse.json({ CAMPAIGN: campaigns.map(c => ({ id: c.id, title: c.title, hint: "", live: c.isActive })), POST: posts.map(p => ({ id: p.id, title: p.title || "دون عنوان", hint: "", live: p.published })), VIDEO: [], PLAYLIST: [], COURSE: [], REPORT: [], BOOKLET: [] });
}
