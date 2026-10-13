import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username") || "";
    const cleanUsername = rawUsername
      .trim()
      .replace(/https?:\/\/(www\.)?github\.com\//i, "")
      .replace(/\/$/, "")
      .replace(/^@/, "");

    if (!cleanUsername) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Adyapan-AI-Copilot/1.0",
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Fetch GitHub user profile
    const userRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUsername)}`,
      { headers, next: { revalidate: 300 } }
    );

    if (!userRes.ok) {
      if (userRes.status === 404) {
        return NextResponse.json(
          { success: false, error: `GitHub user "@${cleanUsername}" was not found.` },
          { status: 404 }
        );
      }
      if (userRes.status === 403) {
        return NextResponse.json(
          { success: false, error: "GitHub rate limit exceeded. Please try again shortly." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, error: `GitHub API error (${userRes.status})` },
        { status: userRes.status }
      );
    }

    const userData = await userRes.json();

    // 2. Fetch public repos
    let reposData: unknown[] = [];
    try {
      const reposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?sort=pushed&per_page=30`,
        { headers, next: { revalidate: 300 } }
      );
      if (reposRes.ok) {
        reposData = await reposRes.json();
      }
    } catch {
      // Repos fetch is non-blocking
    }

    return NextResponse.json({
      success: true,
      user: userData,
      repos: Array.isArray(reposData) ? reposData : [],
    });
  } catch (error) {
    console.error("Next.js /api/github-details error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to GitHub. Please check network connection." },
      { status: 500 }
    );
  }
}
