"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/user?view=profile");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-amber-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-zinc-400">Loading Profile...</p>
      </div>
    </div>
  );
}
