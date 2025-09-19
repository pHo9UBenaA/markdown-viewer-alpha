/**
 * @module Mermaid initialiser injected into markdown pages.
 */

const MERMAID_MODULE_URL =
	"https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const MERMAID_CODE_BLOCK_SELECTOR = "pre code.language-mermaid";
const MERMAID_CONTAINER_CLASS = "mermaid-diagram";
const MERMAID_CONTAINER_TAG = "div";
const CSS_CLASS_SELECTOR_PREFIX = ".";

const upgradeNode = (code) => {
	if (!(code instanceof HTMLElement)) {
		return false;
	}

	const parentPre = code.parentElement;
	if (!parentPre) {
		return false;
	}

	const wrapper = parentPre.parentElement;
	if (!wrapper) {
		return false;
	}

	const content = code.textContent;
	if (!content) {
		return false;
	}

	const container = document.createElement(MERMAID_CONTAINER_TAG);
	container.className = MERMAID_CONTAINER_CLASS;
	container.textContent = content.trim();
	wrapper.replaceChild(container, parentPre);
	return true;
};

(async () => {
	const codeNodes = document.querySelectorAll(MERMAID_CODE_BLOCK_SELECTOR);
	if (codeNodes.length === 0) {
		return;
	}

	let upgradedCount = 0;
	codeNodes.forEach((code) => {
		const upgraded = upgradeNode(code);
		if (upgraded) {
			upgradedCount += 1;
		}
	});

	if (upgradedCount === 0) {
		return;
	}

	const mermaidModule = await import(MERMAID_MODULE_URL);
	const mermaid = mermaidModule?.default;
	if (!mermaid) {
		return;
	}

	mermaid.initialize({ startOnLoad: false });
	await mermaid.run({
		querySelector: `${CSS_CLASS_SELECTOR_PREFIX}${MERMAID_CONTAINER_CLASS}`,
	});
})();
