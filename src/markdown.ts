import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type MarkdownFile = {
	relativePath: string;
	absolutePath: string;
	urlPath: string;
};

const glob = new Bun.Glob("docs/**/*.md");
const docsRoot = `${process.cwd()}/docs`;

export async function listMarkdownFiles(): Promise<MarkdownFile[]> {
	const files: MarkdownFile[] = [];

	for await (const match of glob.scan(".")) {
		if (typeof match !== "string") {
			continue;
		}

		const relativePath = match.replace(/^docs\//, "");
		const absolutePath = `${process.cwd()}/${match}`;

		files.push({
			relativePath,
			absolutePath,
			urlPath: `docs/${relativePath}`,
		});
	}

	files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

	return files;
}

export async function renderMarkdownToHtml(path: string): Promise<string> {
	const sanitizedPath = path.startsWith("docs/")
		? path.replace(/^docs\//, "")
		: path;
	const absolutePath = `${docsRoot}/${sanitizedPath}`;
	const source = await Bun.file(absolutePath).text();

	const result = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeStringify)
		.process(source);

	return String(result);
}
