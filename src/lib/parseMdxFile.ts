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
import remarkExtractAST from '../mdx-plugins/extract-mdast';
import remarkToC from '../mdx-plugins/remark-toc';
import customRehypeKatex from '../mdx-plugins/rehype-math';
import rehypeSnippets from '../mdx-plugins/rehype-snippets';
import { MdxContent } from '../types/content';
import { getLastUpdated } from './getGitAuthorTimestamp';
import { moduleIDToSectionMap, SectionID } from '../../content/ordering';

export async function parseMdxFile(filePath: string): Promise<MdxContent> {
    const { readFile } = await import('fs/promises');
    const fileContent = await readFile(filePath, 'utf-8');
    const { content, data: frontmatter } = matter(fileContent);
    const mdast: any = { data: null };
    const tableOfContents: any = {};

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
                [remarkToC, { tableOfContents }],
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
                rehypeSlug,
                rehypeSnippets,
                [rehypeExternalLinks, { target: '_blank', rel: ['nofollow'] }],
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
            outputFormat: 'function-body',
            jsxImportSource: 'react',
        });
    } catch (error) {
        console.error(`Error compiling MDX for ${filePath}:`, error);
        throw new Error(`Error compiling MDX for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

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

    // Get last updated timestamp from git
    const lastUpdated = await getLastUpdated(filePath);

    let division: string | undefined;
    if (filePath.includes('content')) {
        division = moduleIDToSectionMap[frontmatter.id];
    }

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
        toc: tableOfContents,
        mdast: mdast.data,
        fields: {
            division: division as SectionID,
            gitAuthorTime: lastUpdated,
        },
    };
}
