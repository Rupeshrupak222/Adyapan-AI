import { redirect } from "next/navigation";

export default function AdminProgressReportsPage() {
  redirect("/dashboard/admin?tab=progress-reports");
}
