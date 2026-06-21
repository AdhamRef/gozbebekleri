import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Assets | لوحة التحكم" };

export default async function BrandAssetsPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="assets" snapshot={snapshot} />;
}
