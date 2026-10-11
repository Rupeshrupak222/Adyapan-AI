import { redirect } from "next/navigation";

export default function AdminProgressPage() {
  redirect("/dashboard/admin?tab=progress-reports");
}
