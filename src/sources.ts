/**
 * @file Provides utilities for constructing markdown source managers.
 */

import type { SourceRegistry } from "./libs/source-registry";
import { createSourceRegistry } from "./libs/source-registry";
import type {
	MarkdownSource,
	SourceKey,
	SourceRegistrationResult,
} from "./types/source";

export type MarkdownSources = {
	readonly listSources: () => MarkdownSource[];
	readonly getSource: (sourceKey: SourceKey) => MarkdownSource | undefined;
	readonly registerSource: (
		directoryPath: string,
	) => Promise<SourceRegistrationResult>;
	readonly resetSources: () => void;
};

/**
 * Builds a markdown source manager around the provided registry.
 */
export const createMarkdownSources = (
	registry: SourceRegistry = createSourceRegistry(),
): MarkdownSources => {
	const listSources = () => registry.listSources();
	const getSource = (sourceKey: SourceKey) => registry.getSource(sourceKey);
	const registerSource = async (directoryPath: string) =>
		registry.registerSource(directoryPath);
	const resetSources = () => {
		registry.reset();
	};

	return {
		listSources,
		getSource,
		registerSource,
		resetSources,
	};
};
