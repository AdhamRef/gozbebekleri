import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The "المؤسسات" (organizations) section was removed from the user-facing Brand Center. The route is
 * kept (not deleted) but redirects to the brand guide so old links keep working.
 */
export default function BrandOrganizationsPage() {
  redirect("/dashboard/brand");
}
