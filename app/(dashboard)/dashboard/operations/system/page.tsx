import { redirect } from "next/navigation";

export const metadata = {
  title: "مركز المحتوى والتشغيل | لوحة التحكم",
};

export default function OperationsSystemRedirectPage() {
  redirect("/dashboard/operations");
}
