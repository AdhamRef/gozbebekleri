import { BrandCenterView } from "../_components/BrandCenterView";
import { getBrandCenterSnapshot } from "@/lib/brand/brand-service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Brand Organizations | لوحة التحكم" };

export default async function BrandOrganizationsPage() {
  const snapshot = await getBrandCenterSnapshot();
  return <BrandCenterView activeTab="organizations" snapshot={snapshot} />;
}
