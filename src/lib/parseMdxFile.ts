import fs from 'fs/promises';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { MdxContent } from '../types/content';
import { getLastUpdated } from './getGitAuthorTimestamp';

// Custom rehype plugin for KaTeX with custom error handling
const customRehypeKatex = () => {
    return (tree: any, file: any) => {
        try {
            // Apply the rehypeKatex plugin to the tree
            const katexPlugin = rehypeKatex();
            return katexPlugin(tree, file);
        } catch (error) {
            console.error('KaTeX error:', error);
            return tree;
        }
    };
};

// Custom plugin to extract AST for analysis
const remarkExtractAST = (options: { mdast: any }) => {
    return (tree: any) => {
        if (options) options.mdast = tree;
    };
};

// Custom plugin for table of contents
const remarkToC = (options: { tableOfContents: any }) => {
    return (tree: any) => {
        if (options) {
            options.tableOfContents = [];
            // Implementation for TOC generation would go here
        }
    };
};

export async function parseMdxFile(filePath: string): Promise<MdxContent> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { content, data: frontmatter } = matter(fileContent);
    const mdast: any = {};
    const tableOfContents: any = {};

    // Count language section occurrences
    const langSecOc = (content.match(/<LanguageSection/g) || []).length;
    const cppOc = (content.match(/<CPPSection/g) || []).length;
    const javaOc = (content.match(/<JavaSection/g) || []).length;
    const pyOc = (content.match(/<PySection/g) || []).length;

    // Validate language sections
    if (langSecOc < Math.max(cppOc, javaOc, pyOc)) {
        throw new Error(
            `${filePath}: # lang sections = ${langSecOc} < max(${cppOc},${javaOc},${pyOc})`
        );
    }

    let compiledResult;
    try {
        const processedContent = content.replace(/<!--/g, '{/* ').replace(/-->/g, '*/}');

        // Compile MDX to JSX
        compiledResult = await compile(processedContent, {
            remarkPlugins: [
                remarkGfm,
                remarkMath,
                remarkFrontmatter,
                [remarkMdxFrontmatter, { name: 'frontmatter' }],
                [remarkExtractAST, { mdast }],
                [rehypeExternalLinks, { target: '_blank', rel: ['nofollow'] }],
                [remarkToC, { tableOfContents }],
                rehypeSlug,
                [
                    rehypeAutolinkHeadings,
                    {
                        linkProperties: {
                            ariaHidden: 'true',
                            tabIndex: -1,
                            className: 'anchor before',
                        },
                        content: {
                            type: 'mdxJsxFlowElement',
                            name: 'HeaderLink',
                        },
                    },
                ],
            ],
            rehypePlugins: [
                [
                    rehypeRaw,
                    {
                        passThrough: [
                            'mdxjsEsm',
                            'mdxFlowExpression',
                            'mdxTextExpression',
                            'mdxJsxFlowElement',
                            'mdxJsxTextElement',
                        ],
                    },
                ],
                customRehypeKatex,
            ],
            outputFormat: 'function-body',
        });
    } catch (error) {
        console.error(`Error compiling MDX for ${filePath}:`, error);
        throw new Error(`Error compiling MDX for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Get last updated timestamp from git
    const lastUpdated = await getLastUpdated(filePath);

    return {
        body: String(compiledResult),
        fileAbsolutePath: filePath,
        frontmatter: {
            ...frontmatter,
            lastUpdated,
        } as MdxContent['frontmatter'],
        cppOc,
        javaOc,
        pyOc,
    };
}
