import Head from 'next/head';

interface SEOProps {
  title: string;
  description?: string;
  image?: { src: string; width: number; height: number };
  pathname?: string;
}

export default function SEO({ title, description, image, pathname }: SEOProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://usaco.guide';
  const fullUrl = pathname ? `${siteUrl}${pathname}` : siteUrl;

  return (
    <Head>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {image && (
        <>
          <meta property="og:image" content={`${siteUrl}${image.src}`} />
          <meta property="og:image:width" content={image.width.toString()} />
          <meta property="og:image:height" content={image.height.toString()} />
        </>
      )}
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  );
}
