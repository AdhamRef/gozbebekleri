import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Brand Message Frameworks | لوحة التحكم" };

export default async function BrandFrameworksPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="frameworks" snapshot={snapshot} />;
}
