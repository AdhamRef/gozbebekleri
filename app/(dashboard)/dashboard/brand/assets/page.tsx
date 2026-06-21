import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Assets | لوحة التحكم" };

export default function BrandAssetsPage() {
  return <BrandCenterView activeTab="assets" snapshot={getBrandCenterSnapshot()} />;
}
