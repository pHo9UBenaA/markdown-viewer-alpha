import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createTestEnvironment } from "./helpers/environment";

let environment = createTestEnvironment();

beforeEach(() => {
	environment = createTestEnvironment();
});

afterEach(() => {
	environment.sources.resetSources();
});

describe("buildIndexPage", () => {
	test("renders a collapsible directory tree grouped by source", async () => {
		const html = await environment.buildIndexPage();

		expect(html).toContain("<h2>docs</h2>");
		expect(html).toContain("<details>");
		expect(html).toContain("<summary>mixt_docs/</summary>");
		expect(html).toContain(
			'<a href="/view?path=docs%2Fmixt_docs%2F01_project_overview.md">01_project_overview.md</a>',
		);
		expect(html).toContain('<form method="post" action="/sources"');
		expect(html).toContain('name="directory"');
		expect(html).toContain(
			'<link rel="stylesheet" href="/assets/global.css" />',
		);
		expect(html).toContain(
			'<script type="module" src="/scripts/mermaid.client.js" defer></script>',
		);
	});

	test("includes newly registered sources", async () => {
		const root = await mkdtemp(join(tmpdir(), "markdown-viewer-"));
		const filePath = join(root, "example.md");
		await writeFile(filePath, "# Example\n");

		const { registerSource } = environment.useMarkdownSources();
		const registration = await registerSource(root);

		try {
			expect(registration.ok).toBe(true);
			if (!registration.ok) {
				return;
			}
			const source = registration.value;
			const html = await environment.buildIndexPage();

			expect(html).toContain(`<h2>${source.name}</h2>`);
			expect(html).toContain(
				`<a href="/view?path=${encodeURIComponent(
					`${source.key}/example.md`,
				)}">example.md</a>`,
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("buildMarkdownPage", () => {
	test("renders markdown content inside page", async () => {
		const pageResult = await environment.buildMarkdownPage(
			"docs/mixt_docs/01_project_overview.md",
		);

		expect(pageResult.ok).toBe(true);
		if (!pageResult.ok) {
			return;
		}

		expect(pageResult.value).toContain("<h1>プロジェクト概要</h1>");
		expect(pageResult.value).toContain(
			'<link rel="stylesheet" href="/assets/global.css" />',
		);
		expect(pageResult.value).toContain(
			'<script type="module" src="/scripts/mermaid.client.js" defer></script>',
		);
	});
});
