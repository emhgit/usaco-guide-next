import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Configure page extensions to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
};

// MDX configuration with remark/rehype plugins
const withMDX = createMDX({
  extension: /\\.mdx?$/,
  options: {
    remarkPlugins: [
      require('remark-math'),
      require('remark-frontmatter'),
      require('./src/mdx-plugins/remark-toc'),
      require('./src/mdx-plugins/remark-html-nodes'),
      require('./src/mdx-plugins/mdast-to-string'),
      require('./src/mdx-plugins/extract-mdast'),
    ],
    rehypePlugins: [
      require('./src/mdx-plugins/rehype-math'),
      require('./src/mdx-plugins/rehype-snippets'),
      require('rehype-autolink-headings'),
      require('rehype-external-links'),
    ],
  },
});

export default withMDX(nextConfig);
