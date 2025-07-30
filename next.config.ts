import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Configure page extensions to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
};

// MDX configuration with remark/rehype plugins
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      remarkMath,
      remarkFrontmatter,
      [remarkMdxFrontmatter, { name: 'frontmatter' }],
      // require('./src/mdx-plugins/remark-toc'),
      // require('./src/mdx-plugins/remark-html-nodes'),
      // require('./src/mdx-plugins/mdast-to-string'),
      // require('./src/mdx-plugins/extract-mdast'),
    ],
    rehypePlugins: [
      // require('./src/mdx-plugins/rehype-math'),
      require('./src/mdx-plugins/rehype-snippets'),
      [rehypeAutolinkHeadings, {
        behavior: 'wrap',
        properties: {
          className: ['anchor before'],
          ariaHidden: true,
          tabIndex: -1,
        },
        content: {
          type: 'mdxJsxFlowElement',
          name: 'HeaderLink',
        },
      }],
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },
});

export default withMDX(nextConfig);
