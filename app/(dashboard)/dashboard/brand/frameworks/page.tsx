import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Message Frameworks | لوحة التحكم" };

export default function BrandFrameworksPage() {
  return <BrandCenterView activeTab="frameworks" snapshot={getBrandCenterSnapshot()} />;
}
