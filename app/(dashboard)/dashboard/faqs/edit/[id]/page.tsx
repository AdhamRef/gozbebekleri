import { redirect } from "next/navigation";

/** FAQs are edited with their form (settings page); Gozbebekleri's content editor has no FAQ kind. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/faqs/settings/${encodeURIComponent(id)}`);
}
