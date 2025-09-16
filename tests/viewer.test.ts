import { describe, expect, test } from "bun:test";

import { buildIndexPage, buildMarkdownPage } from "../src/viewer";

describe("buildIndexPage", () => {
	test("includes links for markdown files", async () => {
		const html = await buildIndexPage();

		expect(html).toContain(
			'<a href="/view?path=docs%2Fpostgresql_explain%2FExplain_EXPLAIN.md">docs/postgresql_explain/Explain_EXPLAIN.md</a>',
		);
	});
});

describe("buildMarkdownPage", () => {
	test("renders markdown content inside page", async () => {
		const html = await buildMarkdownPage(
			"docs/postgresql_explain/Explain_EXPLAIN.md",
		);

		expect(html).toContain("<h2>Page 1</h2>");
	});
});
