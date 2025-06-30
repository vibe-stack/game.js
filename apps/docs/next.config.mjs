import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure pageExtensions to include md and mdx
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Optionally provide remark and rehype plugins
  experimental: {
    mdxRs: true,
  },
}

const withMDX = createMDX({
  // Add markdown plugins here, if needed
  // remarkPlugins: [],
  // rehypePlugins: [],
  // If you use `MDXProvider`, uncomment the following line.
  // providerImportSource: "@mdx-js/react",
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig) 