/**
 * @file Exposes helpers for rendering base HTML layout shared by viewer pages.
 */

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const PROJECT_ROOT = process.cwd();
const GLOBAL_CSS_RELATIVE_PATH = "src/ui/global.css" as const;
const CSS_ENCODING_UTF8 = "utf-8" as const;

type LayoutOptions = {
	readonly baseHref?: string;
};

/**
 * Loads the global stylesheet once per request, tolerating missing files in non-production contexts.
 */
export const loadGlobalStyles = async (): Promise<string> => {
	const cssPath = resolve(PROJECT_ROOT, GLOBAL_CSS_RELATIVE_PATH);

	try {
		const details = await stat(cssPath);

		if (!details.isFile()) {
			return "";
		}
	} catch {
		return "";
	}

	return await readFile(cssPath, CSS_ENCODING_UTF8);
};

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

	return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta charset="utf-8" />
    <title>${title}</title>
    ${baseTag}
    <style>${globalCSS}</style>
  </head>
  <body>
    <main>
      ${content}
    </main>
  </body>
</html>`;
};
