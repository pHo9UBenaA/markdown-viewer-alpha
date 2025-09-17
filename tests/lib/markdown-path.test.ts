import { describe, expect, test } from "bun:test";
import { join } from "path";

import {
  deriveRelativeMarkdownPath,
  parseDocumentPath,
  resolveWithinSourceRoot,
} from "../../src/libs/markdown-path";
import { MarkdownPathError } from "../../src/types/markdown";

const ROOT = join(process.cwd(), "docs");

describe("parseDocumentPath", () => {
  test("returns source key and relative path for valid input", () => {
    const result = parseDocumentPath("docs/example/file.md");

    expect(result).toEqual({
      ok: true,
      value: {
        sourceKey: "docs",
        relativePath: "example/file.md",
      },
    });
  });

  test("rejects paths without a source and file", () => {
    const result = parseDocumentPath("docs");

    expect(result).toEqual({
      ok: false,
      error: MarkdownPathError.InvalidFormat,
    });
  });

  test("rejects traversal segments", () => {
    const result = parseDocumentPath("docs/../secret.md");

    expect(result).toEqual({
      ok: false,
      error: MarkdownPathError.PathTraversal,
    });
  });
});

describe("resolveWithinSourceRoot", () => {
  test("allows paths inside the source root", () => {
    const result = resolveWithinSourceRoot(
      ROOT,
      "mixt_docs/01_project_overview.md"
    );

    expect(result).toEqual({
      ok: true,
      value: join(ROOT, "mixt_docs", "01_project_overview.md"),
    });
  });

  test("rejects paths that escape the source root", () => {
    const result = resolveWithinSourceRoot(ROOT, "../outside.md");

    expect(result).toEqual({
      ok: false,
      error: MarkdownPathError.EscapedSource,
    });
  });
});

describe("deriveRelativeMarkdownPath", () => {
  test("normalises separators and strips the source root", () => {
    const absolute = join(ROOT, "mixt_docs", "01_project_overview.md");
    const result = deriveRelativeMarkdownPath(ROOT, absolute);

    expect(result).toEqual({
      ok: true,
      value: "mixt_docs/01_project_overview.md",
    });
  });

  test("rejects absolute paths outside the source root", () => {
    const absolute = join(ROOT, "..", "other", "oops.md");
    const result = deriveRelativeMarkdownPath(ROOT, absolute);

    expect(result).toEqual({
      ok: false,
      error: MarkdownPathError.EscapedSource,
    });
  });
});
