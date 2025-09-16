import { describe, expect, test } from "bun:test";

import { listMarkdownFiles, renderMarkdownToHtml } from "../src/markdown";

describe("listMarkdownFiles", () => {
	test("returns all markdown files under docs", async () => {
		const files = await listMarkdownFiles();

		expect(files).toEqual([
			{
				relativePath: "bun.md",
				absolutePath: expect.stringMatching(/docs\/bun\.md$/),
				urlPath: "docs/bun.md",
			},
			{
				relativePath: "postgresql_explain/Explain_EXPLAIN.md",
				absolutePath: expect.stringMatching(
					/docs\/postgresql_explain\/Explain_EXPLAIN\.md$/,
				),
				urlPath: "docs/postgresql_explain/Explain_EXPLAIN.md",
			},
			{
				relativePath: "remark-rehype.md",
				absolutePath: expect.stringMatching(/docs\/remark-rehype\.md$/),
				urlPath: "docs/remark-rehype.md",
			},
			{
				relativePath: "remark.md",
				absolutePath: expect.stringMatching(/docs\/remark\.md$/),
				urlPath: "docs/remark.md",
			},
		]);
	});
});

describe("renderMarkdownToHtml", () => {
	test("converts markdown to HTML", async () => {
		const html = await renderMarkdownToHtml(
			"docs/postgresql_explain/Explain_EXPLAIN.md",
		);

		expect(html).toContain("<h2>Page 1</h2>");
	});
});
