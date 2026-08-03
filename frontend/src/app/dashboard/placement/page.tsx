import { redirect } from "next/navigation";

export default function PlacementRedirectPage() {
  redirect("/dashboard/user?view=placement-hub");
}
