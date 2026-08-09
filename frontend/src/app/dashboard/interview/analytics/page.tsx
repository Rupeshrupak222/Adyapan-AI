"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function InterviewAnalyticsPage() {
  useRequireAuth("USER");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("sessionId");

  useEffect(() => {
    const targetUrl = sessionId
      ? `/dashboard/user?view=analytics-hub&tab=interview&sessionId=${sessionId}`
      : "/dashboard/user?view=analytics-hub&tab=interview";
    router.replace(targetUrl);
  }, [router, sessionId]);

  return null;
}
