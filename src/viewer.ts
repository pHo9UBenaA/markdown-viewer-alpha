import { listMarkdownFiles, renderMarkdownToHtml } from "./markdown";

type LayoutOptions = {
	baseHref?: string;
};

const getGlobalCSS = async () => {
	const cssPath = `${process.cwd()}/src/global.css`;
	const file = Bun.file(cssPath);
	return await file.text();
};

const layout = async (
	title: string,
	content: string,
	options: LayoutOptions = {},
) => {
	const baseTag = options.baseHref ? `<base href="${options.baseHref}">\n` : "";
	const globalCSS = await getGlobalCSS();

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

export async function buildIndexPage(): Promise<string> {
	const files = await listMarkdownFiles();
	const listItems = files
		.map(
			(file) =>
				`<li><a href="/view?path=${encodeURIComponent(file.urlPath)}">${
					file.urlPath
				}</a></li>`,
		)
		.join("");

	return await layout(
		"Markdown files",
		`<h1>Markdown files</h1><ul>${listItems}</ul>`,
	);
}

export async function buildMarkdownPage(docPath: string): Promise<string> {
	const html = await renderMarkdownToHtml(docPath);
	const directory = docPath.includes("/")
		? `${docPath.slice(0, docPath.lastIndexOf("/") + 1)}`
		: "";

	const content = `
    <nav><a href="/">&larr; Back to list</a></nav>
    <article>${html}</article>
  `;

	return await layout(docPath, content, {
		baseHref: directory ? `/files/${directory}` : undefined,
	});
}
