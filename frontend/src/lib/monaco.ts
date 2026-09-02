"use client";

import { loader } from "@monaco-editor/react";

if (typeof window !== "undefined") {
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs",
    },
  });
}

export { loader };
