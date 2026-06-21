import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Voice | لوحة التحكم" };

export default function BrandVoicePage() {
  return <BrandCenterView activeTab="voice" snapshot={getBrandCenterSnapshot()} />;
}
