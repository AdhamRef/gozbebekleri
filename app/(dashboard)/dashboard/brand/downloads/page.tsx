import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const metadata = { title: "Brand Downloads | لوحة التحكم" };

export default function BrandDownloadsPage() {
  return <BrandCenterView activeTab="downloads" snapshot={getBrandCenterSnapshot()} />;
}
