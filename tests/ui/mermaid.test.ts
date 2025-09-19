import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { renderLayout } from "../../src/ui/layout";

const MERMAID_MODULE_RELATIVE_PATH =
	"src/ui/scripts/mermaid.module.js" as const;
const FILE_ENCODING_UTF8 = "utf-8" as const;

describe("renderLayout", () => {
	test("embeds the mermaid module into the page", async () => {
		const html = await renderLayout("Title", "<p>content</p>");
		const modulePath = resolve(process.cwd(), MERMAID_MODULE_RELATIVE_PATH);
		const expected = await readFile(modulePath, FILE_ENCODING_UTF8);

		expect(html).toContain(expected);
		expect(html).toContain('<script type="module">');
	});
});
