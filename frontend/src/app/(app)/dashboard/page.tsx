import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = { title: "Tu plan · ITOS" };

export default function DashboardPage() {
  return <Dashboard />;
}
