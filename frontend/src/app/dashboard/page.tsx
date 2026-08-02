import { redirect } from "next/navigation";

// Server-side redirect: resolves immediately during the RSC request instead of
// rendering a client page that redirects in a useEffect (avoids a visible flash).
export default function DashboardRedirectPage() {
  redirect("/dashboard/user");
}
