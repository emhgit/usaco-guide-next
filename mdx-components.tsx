import type { MDXComponents } from 'mdx/types'
import Image from 'next/image';

const components: MDXComponents = {
  img: ({ src, alt, title }) => {
    if (!src) return null;
    
    // Handle external images
    if (src.startsWith('http')) {
      return <img src={src} alt={alt || ''} title={title} className="max-w-full h-auto" />;
    }
    
    // Handle local images with Next.js Image
    return (
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <Image
          src={src}
          alt={alt || ''}
          title={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
          placeholder="blur"
          blurDataURL={`data:image/svg+xml;base64,${Buffer.from(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'/>`
          ).toString('base64')}`}
        />
      </div>
    );
  }
}

export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    ...components,
    ...components
  };
}