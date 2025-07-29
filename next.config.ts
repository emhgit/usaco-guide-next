import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Configure page extensions to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Optional: Configure webpack for MDX if needed
  webpack: (config, { isServer }) => {
    // Important: return the modified config
    return config;
  },
};

// MDX configuration with remark/rehype plugins
const withMDX = createMDX({
  extension: /\\.mdx?$/,
  options: {
    remarkPlugins: [
      require('remark-math'),
      require('remark-autolink-headings'),
      require('remark-external-links'),
      require('remark-frontmatter'),
    ],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
