import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Typography | لوحة التحكم" };

export default async function BrandTypographyPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="typography" snapshot={snapshot} />;
}
