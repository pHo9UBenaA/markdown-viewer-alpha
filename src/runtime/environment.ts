import { createSourceRegistry } from "../libs/source-registry";
import type { SourceRegistry } from "../libs/source-registry";
import { createMarkdownLibrary } from "../markdown";
import type { MarkdownLibrary } from "../markdown";
import { createMarkdownSources } from "../sources";
import type { MarkdownSources } from "../sources";
import { createUseMarkdownDocuments } from "../hooks/useMarkdownDocuments";
import type { UseMarkdownDocuments } from "../hooks/useMarkdownDocuments";
import { createUseMarkdownIndex } from "../hooks/useMarkdownIndex";
import type { UseMarkdownIndex } from "../hooks/useMarkdownIndex";
import { createUseMarkdownSources } from "../hooks/useMarkdownSources";
import type { UseMarkdownSources } from "../hooks/useMarkdownSources";
import { createViewer } from "../ui/viewer";
import type { Viewer } from "../ui/viewer";

export type MarkdownViewerEnvironment = {
	readonly registry: SourceRegistry;
	readonly sources: MarkdownSources;
	readonly markdown: MarkdownLibrary;
	readonly useMarkdownSources: UseMarkdownSources;
	readonly useMarkdownDocuments: UseMarkdownDocuments;
	readonly useMarkdownIndex: UseMarkdownIndex;
} & Viewer;

/**
 * Builds an isolated markdown viewer environment with fresh state.
 */
export const createMarkdownViewerEnvironment = (): MarkdownViewerEnvironment => {
	const registry = createSourceRegistry();
	const sources = createMarkdownSources(registry);
	const markdown = createMarkdownLibrary({ sources });
	const useMarkdownSources = createUseMarkdownSources(sources);
	const useMarkdownDocuments = createUseMarkdownDocuments(markdown);
	const useMarkdownIndex = createUseMarkdownIndex({
		useMarkdownSources,
		useMarkdownDocuments,
	});
	const viewer = createViewer({
		useMarkdownDocuments,
		useMarkdownIndex,
	});

	return {
		registry,
		sources,
		markdown,
		useMarkdownSources,
		useMarkdownDocuments,
		useMarkdownIndex,
		...viewer,
	};
};
