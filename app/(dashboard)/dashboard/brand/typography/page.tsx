import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const dynamic = "force-dynamic";

export const metadata = { title: "الخطوط | لوحة التحكم" };

export default async function BrandTypographyPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="typography" snapshot={snapshot} />;
}
