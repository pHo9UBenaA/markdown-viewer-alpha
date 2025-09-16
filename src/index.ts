import { buildIndexPage, buildMarkdownPage } from "./viewer";

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
	port,
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === "/" || url.pathname === "/index.html") {
			const html = await buildIndexPage();

			return new Response(html, {
				headers: {
					"Content-Type": "text/html; charset=utf-8",
				},
			});
		}

		if (url.pathname === "/view") {
			const docPath = url.searchParams.get("path");

			if (!docPath) {
				return new Response("Missing path parameter", { status: 400 });
			}

			if (!docPath.startsWith("docs/") || docPath.includes("..")) {
				return new Response("Invalid document path", { status: 400 });
			}

			try {
				const html = await buildMarkdownPage(docPath);

				return new Response(html, {
					headers: {
						"Content-Type": "text/html; charset=utf-8",
					},
				});
			} catch (error) {
				console.error("Failed to render", error);
				return new Response("Markdown not found", { status: 404 });
			}
		}

		if (url.pathname.startsWith("/files/")) {
			const relativePath = url.pathname.replace(/^\/files\//, "");

			if (!relativePath.startsWith("docs/") || relativePath.includes("..")) {
				return new Response("Invalid file path", { status: 400 });
			}

			const file = Bun.file(`${process.cwd()}/${relativePath}`);

			if (!(await file.exists())) {
				return new Response("Not found", { status: 404 });
			}

			return new Response(file, {
				headers: {
					"Content-Type": file.type || "application/octet-stream",
				},
			});
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Markdown viewer running at http://localhost:${server.port}`);
