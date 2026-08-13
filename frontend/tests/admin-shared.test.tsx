import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

describe("SectionHeader", () => {
  it("renders title and description", () => {
    render(<SectionHeader title="Placement" description="Job discovery" />);
    expect(screen.getByText("Placement")).toBeInTheDocument();
    expect(screen.getByText("Job discovery")).toBeInTheDocument();
  });

  it("omits description when not provided", () => {
    render(<SectionHeader title="Only Title" />);
    expect(screen.getByText("Only Title")).toBeInTheDocument();
    expect(screen.queryByText("Job discovery")).not.toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("renders children with a success variant", () => {
    render(<StatusBadge variant="success">Active</StatusBadge>);
    const badge = screen.getByText("Active");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ background: "rgba(16,185,129,0.12)" });
  });

  it("renders a pulse dot when enabled", () => {
    render(<StatusBadge pulse>Live</StatusBadge>);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });
});
