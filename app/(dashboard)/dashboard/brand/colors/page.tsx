import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Colors | لوحة التحكم" };

export default function BrandColorsPage() {
  return <BrandCenterView activeTab="colors" snapshot={getBrandCenterSnapshot()} />;
}
