import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "دليل الهوية | لوحة التحكم",
};

export default async function BrandCenterLegacyPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="overview" snapshot={snapshot} />;
}
