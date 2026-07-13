import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const dynamic = "force-dynamic";

export const metadata = { title: "الأصول والشعارات | لوحة التحكم" };

export default async function BrandAssetsPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="assets" snapshot={snapshot} />;
}
