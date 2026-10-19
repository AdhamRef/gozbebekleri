import { notFound, redirect } from "next/navigation";
import { impactCampaignPath } from "@/lib/impact/routing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** /impact → the newest active impact builder. */
export default async function ImpactIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const latest = await prisma.impactCampaign.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { slug: true },
  });
  if (!latest) notFound();
  redirect(impactCampaignPath(locale, latest.slug));
}
