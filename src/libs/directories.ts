/**
 * @file Houses helpers for resolving and validating project directories.
 */

import { stat } from "fs/promises";
import { resolve } from "path";

import { failure, success } from "../types/result";
import type { Result } from "../types/result";
import { SourceRegistrationError } from "../types/source";

const PROJECT_ROOT = process.cwd();

/**
 * Resolves a project-relative directory path to an absolute path.
 */
export const resolveProjectPath = (directoryPath: string): string =>
	resolve(PROJECT_ROOT, directoryPath);

/**
 * Ensures the provided absolute path refers to an existing directory.
 */
export const ensureDirectoryExists = async (
	directoryPath: string,
): Promise<Result<string, SourceRegistrationError>> => {
	let directoryStat;

	try {
		directoryStat = await stat(directoryPath);
	} catch {
		return failure(SourceRegistrationError.StatFailed);
	}

	if (!directoryStat.isDirectory()) {
		return failure(SourceRegistrationError.NotDirectory);
	}

	return success(directoryPath);
};
