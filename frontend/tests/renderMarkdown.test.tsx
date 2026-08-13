import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderMarkdown, inlineFormat, CodeBlock } from "@/utils/renderMarkdown";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderMarkdown", () => {
  it("renders headings", () => {
    const { container } = render(<div>{renderMarkdown("# Title\n\n## Sub", true)}</div>);
    expect(container.querySelector("h1")).toHaveTextContent("Title");
    expect(container.querySelector("h2")).toHaveTextContent("Sub");
  });

  it("renders unordered lists", () => {
    const { container } = render(<div>{renderMarkdown("- one\n- two\n- three", true)}</div>);
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("one");
    expect(items[2]).toHaveTextContent("three");
  });

  it("renders ordered lists", () => {
    const { container } = render(<div>{renderMarkdown("1. first\n2. second", true)}</div>);
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container).toHaveTextContent("first");
  });

  it("renders a table", () => {
    const md = "| Name | Role |\n|---|---|\n| Ada | Admin |";
    const { container } = render(<div>{renderMarkdown(md, true)}</div>);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("th")).toHaveTextContent("Name");
    expect(container).toHaveTextContent("Ada");
  });

  it("renders a code block without throwing on copy button", () => {
    render(
      <CodeBlock code="const x = 1;" lang="ts" isDark blockBg="#000" blockBorder="#333" />
    );
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("renders inline and block math without errors", () => {
    const md = "Inline $x^2$ and block $$E = mc^2$$";
    const { container } = render(<div>{renderMarkdown(md, true)}</div>);
    expect(container.querySelectorAll(".katex")).not.toHaveLength(0);
  });

  it("regression: table followed by paragraph does not emit duplicate-key errors", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |\n\nAfter table";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<div>{renderMarkdown(md, true)}</div>);
    expect(container).toHaveTextContent("After table");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("regression: list followed by paragraph does not emit duplicate-key errors", () => {
    const md = "- a\n- b\n\nAfter list";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<div>{renderMarkdown(md, true)}</div>);
    expect(container).toHaveTextContent("After list");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("renders blockquotes and horizontal rules", () => {
    const md = "> quote\n\n---";
    const { container } = render(<div>{renderMarkdown(md, true)}</div>);
    expect(container.querySelector("blockquote")).toHaveTextContent("quote");
    expect(container.querySelector("hr")).toBeInTheDocument();
  });
});

describe("inlineFormat", () => {
  it("renders bold and italic", () => {
    const { container } = render(<div>{inlineFormat("**bold** and *italic*")}</div>);
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
  });

  it("renders inline code", () => {
    const { container } = render(<div>{inlineFormat("run `npm test`")}</div>);
    expect(container.querySelector("code")).toHaveTextContent("npm test");
  });

  it("preserves plain text", () => {
    const { container } = render(<div>{inlineFormat("hello world")}</div>);
    expect(container).toHaveTextContent("hello world");
  });
});
