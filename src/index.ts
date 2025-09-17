/**
 * @file Starts the Bun HTTP server that exposes markdown index and viewing endpoints.
 */

import {
	SourceRegistrationError,
	type SourceRegistrationError as SourceRegistrationErrorType,
} from "./types/source";
import type { MarkdownPathError } from "./types/markdown";
import { MarkdownPathError as MarkdownPathErrorCode } from "./types/markdown";
import { createMarkdownViewerEnvironment } from "./runtime/environment";

const HTTP_STATUS = {
	ok: 200,
	seeOther: 303,
	badRequest: 400,
	notFound: 404,
	internalError: 500,
} as const;

const CONTENT_TYPE_HTML = "text/html; charset=utf-8" as const;
const CONTENT_TYPE_BINARY = "application/octet-stream" as const;
const PATH_ROOT = "/" as const;
const PATH_INDEX = "/index.html" as const;
const PATH_REGISTER_SOURCE = "/sources" as const;
const PATH_VIEW = "/view" as const;
const PATH_FILES_PREFIX = "/files/" as const;
const FORM_FIELD_DIRECTORY = "directory" as const;
const QUERY_DOCUMENT_PATH = "path" as const;
const PORT_FALLBACK = 3000;

const environment = createMarkdownViewerEnvironment();
environment.sources.resetSources();

const {
	useMarkdownSources,
	useMarkdownDocuments,
	buildIndexPage,
	buildMarkdownPage,
} = environment;

const describeRegistrationError = (
	error: SourceRegistrationErrorType,
): string => {
	if (error === SourceRegistrationError.StatFailed) {
		return "Unable to read directory";
	}

	return "Provided path is not a directory";
};

const registrationErrorStatus = (): number => HTTP_STATUS.badRequest;

const describeMarkdownError = (error: MarkdownPathError): string => {
	switch (error) {
		case MarkdownPathErrorCode.UnknownSource:
			return "Unknown markdown source";
		case MarkdownPathErrorCode.MissingFile:
			return "Markdown not found";
		case MarkdownPathErrorCode.InvalidFormat:
			return "Invalid document path";
		case MarkdownPathErrorCode.PathTraversal:
		case MarkdownPathErrorCode.EscapedSource:
			return "Path traversal is not allowed";
		default:
			return "Unable to resolve markdown path";
	}
};

const markdownErrorStatus = (error: MarkdownPathError): number => {
	if (error === MarkdownPathErrorCode.MissingFile) {
		return HTTP_STATUS.notFound;
	}

	return HTTP_STATUS.badRequest;
};

const respondWithHtml = (html: string): Response =>
	new Response(html, {
		headers: { "Content-Type": CONTENT_TYPE_HTML },
	});

const respondWithFailure = (message: string, status: number): Response =>
	new Response(message, { status });

const handleRegisterSource = async (request: Request): Promise<Response> => {
	const formData = await request.formData();
	const directory = formData.get(FORM_FIELD_DIRECTORY);

	if (typeof directory !== "string" || directory.trim() === "") {
		return respondWithFailure("Invalid directory", HTTP_STATUS.badRequest);
	}

	const { registerSource } = useMarkdownSources();
	const registration = await registerSource(directory.trim());

	if (!registration.ok) {
		return respondWithFailure(
			describeRegistrationError(registration.error),
			registrationErrorStatus(),
		);
	}

	return new Response(null, {
		status: HTTP_STATUS.seeOther,
		headers: { Location: PATH_ROOT },
	});
};

const handleViewRequest = async (documentPath: string): Promise<Response> => {
	const pageResult = await buildMarkdownPage(documentPath);

	if (!pageResult.ok) {
		return respondWithFailure(
			describeMarkdownError(pageResult.error),
			markdownErrorStatus(pageResult.error),
		);
	}

	return respondWithHtml(pageResult.value);
};

const handleFileRequest = async (relativePath: string): Promise<Response> => {
	const { resolveDocument } = useMarkdownDocuments();
	const resolved = await resolveDocument(relativePath);

	if (!resolved.ok) {
		return respondWithFailure(
			describeMarkdownError(resolved.error),
			markdownErrorStatus(resolved.error),
		);
	}

	const file = Bun.file(resolved.value.absolutePath);

	return new Response(file, {
		headers: {
			"Content-Type": file.type || CONTENT_TYPE_BINARY,
		},
	});
};

const handleIndexRequest = async (): Promise<Response> => {
	const html = await buildIndexPage();
	return respondWithHtml(html);
};

const handleRequest = async (request: Request): Promise<Response> => {
	const url = new URL(request.url);
	const { pathname } = url;

	if (pathname === PATH_ROOT || pathname === PATH_INDEX) {
		return await handleIndexRequest();
	}

	if (pathname === PATH_REGISTER_SOURCE && request.method === "POST") {
		return await handleRegisterSource(request);
	}

	if (pathname === PATH_VIEW) {
		const documentPath = url.searchParams.get(QUERY_DOCUMENT_PATH);

		if (!documentPath) {
			return respondWithFailure("Missing path parameter", HTTP_STATUS.badRequest);
		}

		return await handleViewRequest(documentPath);
	}

	if (pathname.startsWith(PATH_FILES_PREFIX)) {
		const relativePath = pathname.slice(PATH_FILES_PREFIX.length);

		if (!relativePath) {
			return respondWithFailure("Invalid file path", HTTP_STATUS.badRequest);
		}

		return await handleFileRequest(relativePath);
	}

	return respondWithFailure("Not found", HTTP_STATUS.notFound);
};

const port = Number(process.env.PORT ?? PORT_FALLBACK);

const server = Bun.serve({
	port,
	async fetch(request) {
		try {
			return await handleRequest(request);
		} catch (error) {
			console.error("Unexpected error", error);
			return respondWithFailure("Internal server error", HTTP_STATUS.internalError);
		}
	},
});

console.log(`Markdown viewer running at http://localhost:${server.port}`);
