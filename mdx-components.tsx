import type { MDXComponents } from 'mdx/types';
import ImageBase from 'next/image';
import React from 'react';

export const Image = (props: {
  src: string;
  alt: string;
  title?: string;
  style?: React.CSSProperties;
}) => {
  if (!props.src) return null;
  
  // Handle external images
  if (props.src.startsWith('http')) {
    return <img src={props.src} alt={props.alt} title={props.title} className="max-w-full h-auto" style={props.style} />;
  }
  
  // Handle local images with Next.js Image
  return (
    <ImageBase
      src={props.src}
      alt={props.alt}
      title={props.title}
      fill
      className="object-cover"
      style={props.style}
      sizes="(max-width: 768px) 100vw, 768px"
      placeholder="blur"
      blurDataURL={`data:image/svg+xml;base64,${Buffer.from(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'/>`
      ).toString('base64')}`}
    />
  );
};

const components: MDXComponents = {
  img: ({ src, alt, title }) => (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <Image src={src || ''} alt={alt || ''} title={title} />
    </div>
  )
};

export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    ...components,
    ...components
  };
}