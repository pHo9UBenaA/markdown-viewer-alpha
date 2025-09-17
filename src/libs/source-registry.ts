/**
 * @file Provides a dedicated registry factory for managing markdown sources.
 */

import { basename } from "path";

import { ensureDirectoryExists, resolveProjectPath } from "./directories";
import { success } from "../types/result";
import {
	DEFAULT_SOURCE_DIRECTORY,
	DEFAULT_SOURCE_KEY,
	DEFAULT_SOURCE_NAME,
	GENERATED_SOURCE_PREFIX,
	type MarkdownSource,
	type SourceKey,
	type SourceRegistrationResult,
} from "../types/source";

/** Internal shape for registry state. */
type RegistryState = {
	sources: Map<SourceKey, MarkdownSource>;
	nextId: number;
};

const INITIAL_NEXT_ID = 1;

const createDefaultSource = (): MarkdownSource => ({
	key: DEFAULT_SOURCE_KEY,
	name: DEFAULT_SOURCE_NAME,
	rootPath: resolveProjectPath(DEFAULT_SOURCE_DIRECTORY),
});

const createInitialState = (): RegistryState => ({
	sources: new Map([[DEFAULT_SOURCE_KEY, createDefaultSource()]]),
	nextId: INITIAL_NEXT_ID,
});

/**
 * Builds a generator-style source registry that can be instantiated per consumer.
 */
export const createSourceRegistry = () => {
	let state: RegistryState = createInitialState();

	const buildGeneratedKey = (identifier: number): SourceKey =>
		`${GENERATED_SOURCE_PREFIX}${identifier}`;

	return {
		/** Returns a snapshot array of registered sources. */
		listSources(): MarkdownSource[] {
			return [...state.sources.values()];
		},

		/** Retrieves a single source by key. */
		getSource(sourceKey: SourceKey): MarkdownSource | undefined {
			return state.sources.get(sourceKey);
		},

		/** Registers a new directory as a markdown source. */
		async registerSource(
			directoryPath: string,
		): Promise<SourceRegistrationResult> {
			const absolutePath = resolveProjectPath(directoryPath);
			const directoryCheck = await ensureDirectoryExists(absolutePath);

			if (!directoryCheck.ok) {
				return directoryCheck;
			}

			const normalisedPath = directoryCheck.value;
			const generatedKey = buildGeneratedKey(state.nextId);
			const source: MarkdownSource = {
				key: generatedKey,
				name: basename(normalisedPath) || normalisedPath,
				rootPath: normalisedPath,
			};

			const nextSources = new Map(state.sources);
			nextSources.set(generatedKey, source);

			state = {
				sources: nextSources,
				nextId: state.nextId + 1,
			};

			return success(source);
		},

		/** Restores the registry to its initial default state. */
		reset(): void {
			state = createInitialState();
		},
	};
};

export type SourceRegistry = ReturnType<typeof createSourceRegistry>;
