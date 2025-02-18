import { BLOCKS, MARKS, INLINES } from "@contentful/rich-text-types";
import type { Options } from "@contentful/rich-text-html-renderer";

export const richTextOptions:Options = {
    // For styling bold text, italic text, code blocks, etc.
    renderMark: {
        [MARKS.BOLD]: (text:string) => `<strong class="font-bold">${text}</strong>`,
        [MARKS.ITALIC]: (text:string) => `<em class="italic">${text}</em>`,
        [MARKS.UNDERLINE]: (text:string) => `<span class="underline">${text}</span>`,
        [MARKS.CODE]: (text:string) => `<code class="font-mono bg-gray-200 px-1">${text}</code>`,
    },

    // For styling headings, paragraphs, and links, etc.
    renderNode: {
        //Document rendering rules
        [BLOCKS.DOCUMENT]: (node, children) => {
            //TODO: Set proper classes for document
            return `<div class="bg-pink">${children(node.content)}</div>`;
        },
        //Paragraph rendering rules
        [BLOCKS.PARAGRAPH]: (node, children) => {
            //TODO: Set proper classes for paragraphs
            return `<p class="mb-4 leading-6">${children(node.content)}</p>`;
        },
        //H1 rendering rules
        [BLOCKS.HEADING_1]: (node, children) => {
            //TODO: Set proper classes for H1
            return `<h1 class="text-2xl font-bold my-4">${children(node.content)}</h1>`;
        },
        //H2 rendering rules
        [BLOCKS.HEADING_2]: (node, children) => {
            //TODO: Set proper classes for H2
            return `<h2 class="text-xl font-semibold my-3">${children(node.content)}</h2>`;
        },
        //H3 rendering rules
        [BLOCKS.HEADING_3]: (node, children) => {
            //TODO: Set proper classes for H3
            return `<h3 class="text-xl font-semibold my-3">${children(node.content)}</h3>`;
        },
        //H4 rendering rules
        [BLOCKS.HEADING_4]: (node, children) => {
            //TODO: Set proper classes for H4
            return `<h4 class="text-xl font-semibold my-3">${children(node.content)}</h4>`;
        },
        //H5 rendering rules
        [BLOCKS.HEADING_5]: (node, children) => {
            //TODO: Set proper classes for H5
            return `<h5 class="text-xl font-semibold my-3">${children(node.content)}</h5>`;
        },
        //H6 rendering rules
        [BLOCKS.HEADING_6]: (node, children) => {
            //TODO: Set proper classes for H6
            return `<h6 class="text-xl font-semibold my-3">${children(node.content)}</h6>`;
        },
        //Unordered List rendering rules
        [BLOCKS.UL_LIST]: (node, children) => {
            //TODO: Set proper classes for UL
            return `<ul class="list-disc list-inside my-2">${children(node.content)}</ul>`;
        },
        //Ordered List rendering rules
        [BLOCKS.OL_LIST]: (node, children) => {
            //TODO: Set proper classes for OL
            return `<ol class="list-decimal list-inside my-2">${children(node.content)}</ol>`;
        },
        //List Item rendering rules
        [BLOCKS.LIST_ITEM]: (node, children) => {
            //TODO: Set proper classes for LI
            return `<li class="mb-1">${children(node.content)}</li>`;
        },
        //Blockquote rendering rules
        [BLOCKS.QUOTE]: (node, children) => {
            //TODO: Set proper classes for blockquote
            return `<blockquote class="mb-1">${children(node.content)}</blockquote>`;
        },
        //Blockquote rendering rules
        [BLOCKS.HR]: (node, children) => {
            //TODO: Set proper classes for blockquote
            return `<hr />`;
        },
        [BLOCKS.EMBEDDED_ENTRY]: (node, children) => {
            //TODO: Implement block embedded entry rendering
            return `<hr />`;
        },
        [BLOCKS.EMBEDDED_ASSET]: (node, children) => {
            //TODO: Implement block embedded entry rendering
            return `<br />`;
        },
        [BLOCKS.EMBEDDED_RESOURCE]: (node, children) => {
            return `<br />`;
        },

        [INLINES.EMBEDDED_ENTRY]: (node, children) => {
            //TODO: Implement inline embedded entry rendering
            return `<hr />`;
        },
        [INLINES.EMBEDDED_RESOURCE]: (node, children) => {
            //TODO: Implement inline embedded resource rendering
            return `<hr />`;
        },
        //Hyperlink rendering rules
        [INLINES.HYPERLINK]: (node, children) => {
            // This checks for a URL and sets Tailwind classes for links
            const url = node.data.uri || "#";
            return `<a href="${url}" class="underline text-blue-600 hover:text-blue-800">${children(node.content)}</a>`;
        },
        //Hyperlink rendering rules
        [INLINES.ENTRY_HYPERLINK]: (node, children) => {
            //TODO: Implement inline entry hyperlink rendering
            const url = node.data.uri || "#";
            return `<a href="${url}" class="underline text-blue-600 hover:text-blue-800">${children(node.content)}</a>`;
        },
        //Hyperlink rendering rules
        [INLINES.ASSET_HYPERLINK]: (node, children) => {
            //TODO: Implement inline asset hyperlink rendering
            const url = node.data.uri || "#";
            return `<a href="${url}" class="underline text-blue-600 hover:text-blue-800">${children(node.content)}</a>`;
        },
        //Hyperlink rendering rules
        [INLINES.RESOURCE_HYPERLINK]: (node, children) => {
            //TODO: Implement inline resource hyperlink rendering
            const url = node.data.uri || "#";
            return `<a href="${url}" class="underline text-blue-600 hover:text-blue-800">${children(node.content)}</a>`;
        },
    },
};