import { useCachedImages } from "../../context/CachedImagesContext";
import ImageBase from "next/image";

export default function MarkdownImage({
  src,
  alt,
  title,
}: {
  src: string;
  alt: string;
  title: string;
}) {
  const cachedImages = useCachedImages();
  const renderImage = (
    imageSrc: string,
    imageAlt: string,
    imageTitle: string
  ) => (
    <ImageBase
      src={imageSrc}
      alt={imageAlt}
      title={imageTitle}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 768px"
      placeholder="blur"
      blurDataURL={`data:image/svg+xml;base64,${Buffer.from(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'/>`
      ).toString("base64")}`}
    />
  );

  if (cachedImages.has(src)) {
    const image = cachedImages.get(src);
    const imageElement = renderImage(image.src, alt, title);

    // Wrap in figure for semantic HTML
    return (
      <figure className="relative w-full h-full">
        {image.originalImageLink ? (
          <a
            href={image.originalImageLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {imageElement}
          </a>
        ) : (
          imageElement
        )}
        {image.caption && (
          <figcaption className="text-center text-sm mt-2 text-gray-600">
            {image.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className="relative w-full h-full">
      {renderImage(src, alt, title)}
    </figure>
  );
}
