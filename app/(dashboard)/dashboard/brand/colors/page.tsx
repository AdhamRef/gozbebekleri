import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Brand Colors | لوحة التحكم" };

export default async function BrandColorsPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="colors" snapshot={snapshot} />;
}
