import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Voice | لوحة التحكم" };

export default async function BrandVoicePage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="voice" snapshot={snapshot} />;
}
