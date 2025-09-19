/**
 * @file Starts the Node.js HTTP server that exposes markdown index and viewing endpoints.
 */

import { readFile } from "node:fs/promises";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { extname } from "node:path";
import { Readable } from "node:stream";
import { TLSSocket } from "node:tls";
import { createMarkdownViewerEnvironment } from "./runtime/environment";
import type { MarkdownPathError } from "./types/markdown";
import { MarkdownPathError as MarkdownPathErrorCode } from "./types/markdown";
import {
	SourceRegistrationError,
	type SourceRegistrationError as SourceRegistrationErrorType,
} from "./types/source";

const HTTP_STATUS = {
	ok: 200,
	seeOther: 303,
	badRequest: 400,
	notFound: 404,
	internalError: 500,
} as const;

const CONTENT_TYPE_HTML = "text/html; charset=utf-8" as const;
const CONTENT_TYPE_BINARY = "application/octet-stream" as const;
const CONTENT_TYPE_FORM_URLENCODED =
	"application/x-www-form-urlencoded" as const;
const METHOD_GET = "GET" as const;
const METHOD_HEAD = "HEAD" as const;
const METHOD_POST = "POST" as const;
const PATH_ROOT = "/" as const;
const PATH_INDEX = "/index.html" as const;
const PATH_REGISTER_SOURCE = "/sources" as const;
const PATH_VIEW = "/view" as const;
const PATH_FILES_PREFIX = "/files/" as const;
const FORM_FIELD_DIRECTORY = "directory" as const;
const QUERY_DOCUMENT_PATH = "path" as const;
const PORT_FALLBACK = 3000;
const HOST_FALLBACK = "localhost" as const;
const PROTOCOL_HTTP = "http" as const;
const PROTOCOL_HTTPS = "https" as const;
const REQUEST_DUPLEX_HALF = "half" as const;

const MIME_BY_EXTENSION = {
	".css": "text/css; charset=utf-8",
	".html": CONTENT_TYPE_HTML,
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".md": "text/markdown; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
} as const;

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

const detectContentType = (filePath: string): string => {
	const extension = extname(filePath).toLowerCase();
	const match = MIME_BY_EXTENSION[extension as keyof typeof MIME_BY_EXTENSION];

	return match ?? CONTENT_TYPE_BINARY;
};

const isBodylessMethod = (method: string): boolean =>
	method === METHOD_GET || method === METHOD_HEAD;

type RequestBodyStream = globalThis.ReadableStream<Uint8Array>;

/**
 * Converts an incoming Node.js request stream to a WHATWG readable stream used by Fetch APIs.
 */
const toRequestBodyStream = (incoming: IncomingMessage): RequestBodyStream =>
	Readable.toWeb(incoming) as unknown as RequestBodyStream;

/**
 * Derives the request protocol from the underlying socket, defaulting to HTTP when TLS is absent.
 */
const deriveRequestProtocol = (
	socket: IncomingMessage["socket"],
): typeof PROTOCOL_HTTP | typeof PROTOCOL_HTTPS =>
	socket instanceof TLSSocket ? PROTOCOL_HTTPS : PROTOCOL_HTTP;

const normalisePort = (rawPort: string | undefined): number => {
	if (!rawPort) {
		return PORT_FALLBACK;
	}

	const parsed = Number(rawPort);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		return PORT_FALLBACK;
	}

	return parsed;
};

const buildRequestFromIncomingMessage = (
	incoming: IncomingMessage,
): Request => {
	const method = incoming.method ?? METHOD_GET;
	const protocol = deriveRequestProtocol(incoming.socket);
	const host = incoming.headers.host ?? HOST_FALLBACK;
	const rawUrl = incoming.url ?? PATH_ROOT;
	const requestUrl = new URL(rawUrl, `${protocol}://${host}`);
	const headers = new Headers();

	for (const [key, value] of Object.entries(incoming.headers)) {
		if (typeof value === "undefined") {
			continue;
		}

		if (Array.isArray(value)) {
			for (const entry of value) {
				headers.append(key, entry);
			}
			continue;
		}

		headers.append(key, value);
	}

	const baseInit: RequestInit = {
		method,
		headers,
	};

	if (isBodylessMethod(method)) {
		return new Request(requestUrl, baseInit);
	}

	const bodyStream = toRequestBodyStream(incoming);

	return new Request(requestUrl, {
		...baseInit,
		body: bodyStream,
		duplex: REQUEST_DUPLEX_HALF,
	});
};

const sendResponseToClient = async (
	client: ServerResponse,
	response: Response,
): Promise<void> => {
	const headers: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});

	client.writeHead(response.status, headers);

	if (!response.body) {
		client.end();
		return;
	}

	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	client.end(buffer);
};

const respondWithHtml = (html: string): Response =>
	new Response(html, {
		headers: { "Content-Type": CONTENT_TYPE_HTML },
	});

const respondWithFailure = (message: string, status: number): Response =>
	new Response(message, { status });

const readDirectoryField = async (request: Request): Promise<string | null> => {
	const contentType = request.headers.get("content-type") ?? "";

	if (!contentType.includes(CONTENT_TYPE_FORM_URLENCODED)) {
		return null;
	}

	const body = await request.text();
	const fields = new URLSearchParams(body);
	const directory = fields.get(FORM_FIELD_DIRECTORY);

	if (!directory) {
		return null;
	}

	const trimmed = directory.trim();

	return trimmed === "" ? null : trimmed;
};

const handleRegisterSource = async (request: Request): Promise<Response> => {
	const directory = await readDirectoryField(request);

	if (!directory) {
		return respondWithFailure("Invalid directory", HTTP_STATUS.badRequest);
	}

	const { registerSource } = useMarkdownSources();
	const registration = await registerSource(directory);

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

	const fileBuffer = await readFile(resolved.value.absolutePath);
	const contentType = detectContentType(resolved.value.absolutePath);
	const uint8Array = new Uint8Array(fileBuffer);

	return new Response(uint8Array, {
		headers: {
			"Content-Type": contentType,
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

	if (pathname === PATH_REGISTER_SOURCE && request.method === METHOD_POST) {
		return await handleRegisterSource(request);
	}

	if (pathname === PATH_VIEW) {
		const documentPath = url.searchParams.get(QUERY_DOCUMENT_PATH);

		if (!documentPath) {
			return respondWithFailure(
				"Missing path parameter",
				HTTP_STATUS.badRequest,
			);
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

const port = normalisePort(process.env.PORT);

const server = createServer(async (incomingRequest, serverResponse) => {
	try {
		const request = buildRequestFromIncomingMessage(incomingRequest);
		const response = await handleRequest(request);
		await sendResponseToClient(serverResponse, response);
	} catch (error) {
		console.error("Unexpected error", error);
		const fallback = respondWithFailure(
			"Internal server error",
			HTTP_STATUS.internalError,
		);
		await sendResponseToClient(serverResponse, fallback);
	}
});

server.listen(port, () => {
	const address = server.address();
	const resolvedPort =
		typeof address === "object" && address !== null ? address.port : port;

	console.log(
		`Markdown viewer running at http://${HOST_FALLBACK}:${resolvedPort}`,
	);
});
