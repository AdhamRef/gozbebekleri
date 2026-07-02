import { redirect } from "next/navigation";

export const metadata = {
  title: "لوحة التحكم",
};

export default function SystemOverviewRedirectPage() {
  redirect("/dashboard");
}
