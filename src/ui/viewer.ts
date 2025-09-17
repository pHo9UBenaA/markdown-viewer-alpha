/**
 * @file Generates HTML views for the markdown directory listing and individual markdown pages.
 */
import type { UseMarkdownDocuments } from "../hooks/useMarkdownDocuments";
import type { UseMarkdownIndex } from "../hooks/useMarkdownIndex";
import { renderLayout } from "./layout";
import { renderNavigationTree, type FileHrefBuilder } from "./navigation";
import { success } from "../types/result";
import type { MarkdownPathResult } from "../types/markdown";

const DIRECTORY_SEPARATOR = "/" as const;
const INDEX_PAGE_TITLE = "Markdown files" as const;
const BACK_LINK_LABEL = "← Back to list" as const;
const ADD_SOURCE_ACTION = "/sources" as const;
const ADD_SOURCE_METHOD = "post" as const;
const ADD_SOURCE_INPUT_NAME = "directory" as const;
const VIEW_PATH_QUERY = "path" as const;
const buildViewHref: FileHrefBuilder = (file) =>
	`/view?${VIEW_PATH_QUERY}=${encodeURIComponent(file.urlPath)}`;

export type Viewer = {
	readonly buildIndexPage: () => Promise<string>;
	readonly buildMarkdownPage: (
		documentPath: string,
	) => Promise<MarkdownPathResult<string>>;
};

type ViewerDeps = {
	readonly useMarkdownDocuments: UseMarkdownDocuments;
	readonly useMarkdownIndex: UseMarkdownIndex;
};

/**
 * Builds HTML generation helpers for the provided markdown environment.
 */
export const createViewer = ({
	useMarkdownDocuments,
	useMarkdownIndex,
}: ViewerDeps): Viewer => {
	const buildIndexPage = async (): Promise<string> => {
		const { sections } = await useMarkdownIndex();

		const addSourceForm = `
	  <form method="${ADD_SOURCE_METHOD}" action="${ADD_SOURCE_ACTION}" class="add-source-form">
	    <label for="${ADD_SOURCE_INPUT_NAME}">追加するディレクトリ</label>
	    <div class="form-row">
	      <input type="text" id="${ADD_SOURCE_INPUT_NAME}" name="${ADD_SOURCE_INPUT_NAME}" placeholder="/path/to/docs" required />
	      <button type="submit" aria-label="Add markdown directory">+</button>
	    </div>
	  </form>
	`;

		const sectionsMarkup = sections
			.map(({ source, files, tree }) => {
				if (!tree || files.length === 0) {
					return `<section class="source"><h2>${source.name}</h2><p>No markdown files found.</p></section>`;
				}

				const treeMarkup = renderNavigationTree(tree, buildViewHref, "file-tree");

				return `<section class="source"><h2>${source.name}</h2>${treeMarkup}</section>`;
			})
			.join("");

		return await renderLayout(
			INDEX_PAGE_TITLE,
			`<h1>${INDEX_PAGE_TITLE}</h1>${addSourceForm}${sectionsMarkup}`,
		);
	};

	const buildMarkdownPage = async (
		documentPath: string,
	): Promise<MarkdownPathResult<string>> => {
		const { renderDocument } = useMarkdownDocuments();
		const markdownResult = await renderDocument(documentPath);

		if (!markdownResult.ok) {
			return markdownResult;
		}

		const directory = documentPath.includes(DIRECTORY_SEPARATOR)
			? `${documentPath.slice(0, documentPath.lastIndexOf(DIRECTORY_SEPARATOR) + 1)}`
			: "";

		const content = `
    <nav><a href="/">${BACK_LINK_LABEL}</a></nav>
    <article>${markdownResult.value}</article>
  `;

		const page = await renderLayout(documentPath, content, {
			baseHref: directory ? `/files/${directory}` : undefined,
		});

		return success(page);
	};

	return {
		buildIndexPage,
		buildMarkdownPage,
	};
};
