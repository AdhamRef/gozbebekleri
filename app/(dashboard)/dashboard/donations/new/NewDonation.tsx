"use client";

import { useRouter } from "next/navigation";
import { CreateDonationDialog } from "@/components/dashboard/donations/CreateDonationDialog";

export function NewDonation() {
  const router = useRouter();
  const finish = () => router.replace("/dashboard/donations");
  return <CreateDonationDialog onClose={finish} onCreated={finish} />;
}
