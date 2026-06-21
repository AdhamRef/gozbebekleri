import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Typography | لوحة التحكم" };

export default function BrandTypographyPage() {
  return <BrandCenterView activeTab="typography" snapshot={getBrandCenterSnapshot()} />;
}
