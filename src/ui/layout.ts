/**
 * @file Exposes helpers for rendering base HTML layout shared by viewer pages.
 */

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const PROJECT_ROOT = process.cwd();
const GLOBAL_CSS_RELATIVE_PATH = "src/ui/global.css" as const;
const CSS_ENCODING_UTF8 = "utf-8" as const;
const SCRIPT_TYPE_MODULE = "module";
const MERMAID_MODULE_RELATIVE_PATH =
	"src/ui/scripts/mermaid.module.js" as const;
const JAVASCRIPT_ENCODING_UTF8 = "utf-8" as const;

type LayoutOptions = {
	readonly baseHref?: string;
};

/**
 * Loads a UTF-8 encoded file relative to the project root when present.
 */
const loadFileIfPresent = async (
	relativePath: string,
	encoding: typeof CSS_ENCODING_UTF8 | typeof JAVASCRIPT_ENCODING_UTF8,
): Promise<string> => {
	const absolutePath = resolve(PROJECT_ROOT, relativePath);

	try {
		const details = await stat(absolutePath);

		if (!details.isFile()) {
			return "";
		}
	} catch {
		return "";
	}

	return await readFile(absolutePath, encoding);
};

/**
 * Loads the global stylesheet once per request, tolerating missing files in non-production contexts.
 */
export const loadGlobalStyles = async (): Promise<string> => {
	return await loadFileIfPresent(GLOBAL_CSS_RELATIVE_PATH, CSS_ENCODING_UTF8);
};

/**
 * Loads the Mermaid initialisation script that runs in the browser.
 */
const loadMermaidModule = async (): Promise<string> =>
	await loadFileIfPresent(
		MERMAID_MODULE_RELATIVE_PATH,
		JAVASCRIPT_ENCODING_UTF8,
	);

/**
 * Renders the shared HTML page structure with optional base href.
 */
export const renderLayout = async (
	title: string,
	content: string,
	options: LayoutOptions = {},
): Promise<string> => {
	const baseTag = options.baseHref ? `<base href="${options.baseHref}">\n` : "";
	const globalCSS = await loadGlobalStyles();
	const mermaidModule = await loadMermaidModule();

	return [
		"<!doctype html>",
		"<html>",
		"  <head>",
		'    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
		'    <meta charset="utf-8" />',
		`    <title>${title}</title>`,
		`    ${baseTag}`,
		`    <style>${globalCSS}</style>`,
		"  </head>",
		"  <body>",
		"    <main>",
		`      ${content}`,
		"    </main>",
		`    <script type="${SCRIPT_TYPE_MODULE}">${mermaidModule}</script>`,
		"  </body>",
		"</html>",
	].join("\n");
};
