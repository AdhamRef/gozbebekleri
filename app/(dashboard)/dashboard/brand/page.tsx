import { BrandCenterView } from "./_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = {
  title: "Brand Center | لوحة التحكم",
};

export default function BrandPage() {
  return <BrandCenterView activeTab="overview" snapshot={getBrandCenterSnapshot()} />;
}
