"use client";

import dynamic from "next/dynamic";

function Skeleton() {
  return (
    <div className="w-full min-h-[400px] flex flex-col gap-4 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-md animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 w-48 bg-amber-500/20 rounded-md" />
        <div className="h-8 w-8 bg-amber-500/20 rounded-full" />
      </div>
      <div className="flex-1 flex flex-col gap-3 justify-center">
        <div className="h-4 w-full bg-amber-500/10 rounded-md" />
        <div className="h-4 w-5/6 bg-amber-500/10 rounded-md" />
        <div className="h-4 w-2/3 bg-amber-500/10 rounded-md" />
      </div>
    </div>
  );
}

const AptitudeEngineView = dynamic(
  () => import("@/components/aptitude-hub/AptitudeEngineView").then((m) => m.AptitudeEngineView),
  { loading: () => <Skeleton /> }
);

export default function AptitudeEnginePage() {
  return <AptitudeEngineView setView={() => {}} activeModule="aptitude-engine" />;
}
