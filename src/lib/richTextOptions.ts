import { BLOCKS, MARKS, INLINES } from "@contentful/rich-text-types";
import type { Options } from "@contentful/rich-text-html-renderer";

export const richTextOptions:Options = {
    // For styling bold text, italic text, code blocks, etc.
    renderMark: {
        [MARKS.BOLD]: (text:string) => `<strong class="font-bold">${text}</strong>`,
        [MARKS.ITALIC]: (text:string) => `<em class="italic">${text}</em>`,
    },

    // For styling headings, paragraphs, and links, etc.
    renderNode: {
        [BLOCKS.PARAGRAPH]: (node, children) => {
            return `<p class="mb-4 text-sm leading-6 text-black">${children(node.content)}</p>`;
        },
        [BLOCKS.HEADING_1]: (node, children) => {
            return `<h1 class="text-2xl font-bold my-4">${children(node.content)}</h1>`;
        },
        [BLOCKS.HEADING_2]: (node, children) => {
            return `<h2 class="text-xl font-semibold my-3">${children(node.content)}</h2>`;
        },
        [BLOCKS.UL_LIST]: (node, children) => {
            return `<ul class="list-disc list-inside my-2">${children(node.content)}</ul>`;
        },
        [BLOCKS.OL_LIST]: (node, children) => {
            return `<ol class="list-decimal list-inside my-2">${children(node.content)}</ol>`;
        },
        [BLOCKS.LIST_ITEM]: (node, children) => {
            return `<li class="mb-1">${children(node.content)}</li>`;
        },
        [INLINES.HYPERLINK]: (node, children) => {
            // This checks for a URL and sets Tailwind classes for links
            const url = node.data.uri || "#";
            return `<a href="${url}" class="underline text-blue-600 hover:text-blue-800">${children(node.content)}</a>`;
        },
    },
};