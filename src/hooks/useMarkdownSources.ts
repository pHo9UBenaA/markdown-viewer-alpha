/**
 * @file Exposes a React-style hook facade for interacting with markdown sources without UI dependencies.
 */

import type { MarkdownSources } from "../sources";
import type { MarkdownSource, SourceRegistrationResult } from "../types/source";

/** Snapshot of current markdown sources and associated actions. */
export type MarkdownSourcesState = {
	readonly sources: MarkdownSource[];
	readonly listSources: () => MarkdownSource[];
	readonly registerSource: (
		directoryPath: string,
	) => Promise<SourceRegistrationResult>;
	readonly resetSources: () => void;
};

export type UseMarkdownSources = () => MarkdownSourcesState;

/**
 * Provides helpers for querying and mutating markdown source registration.
 */
export const createUseMarkdownSources =
	(sources: MarkdownSources): UseMarkdownSources =>
	() => {
		const listSources = () => sources.listSources();

		return {
			sources: listSources(),
			listSources,
			registerSource: (directoryPath: string) =>
				sources.registerSource(directoryPath),
			resetSources: () => {
				sources.resetSources();
			},
		};
	};
