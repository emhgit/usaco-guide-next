import { useCachedImages } from "../../context/CachedImagesContext";
import ImageBase from "next/image";

export default function MarkdownImage({
  src,
  alt,
  title,
}: {
  src: string;
  alt?: string;
  title?: string;
}) {
  const cachedImages = useCachedImages();
  const fallBackSvg = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'/>`
  ).toString("base64")}`;

  const renderImage = (
    imageSrc: string,
    imageAlt = "",
    imageTitle = "",
    svg = fallBackSvg,
    aspectRatio?: number
  ) => {
    if (aspectRatio) {
      // Use aspect ratio container when we have the ratio
      return (
        <div
          className="relative w-full"
          style={{
            paddingBottom: `${(1 / aspectRatio) * 100}%`,
          }}
        >
          <ImageBase
            src={imageSrc}
            alt={imageAlt}
            title={imageTitle}
            fill
            className="object-contain w-full h-full m-0 absolute top-0 left-0"
            placeholder="blur"
            blurDataURL={svg}
          />
        </div>
      );
    } else {
      // Use natural height when no aspect ratio is available
      return (
        <ImageBase
          src={imageSrc}
          alt={imageAlt}
          title={imageTitle}
          width={0}
          height={0}
          className="w-full h-full m-0"
          sizes="(max-width: 768px) 100vw, 768px"
          placeholder="blur"
          blurDataURL={svg}
          unoptimized
        />
      );
    }
  };

  if (cachedImages && cachedImages.has(src)) {
    const image = cachedImages.get(src)!;
    const ratio =
      image.processedImage?.imageMetadata.width /
      image.processedImage?.imageMetadata.height;
    const bgImage = image.processedImage?.imageMetadata.hasAlpha
      ? ""
      : image.processedImage?.src;
    const imageElement = renderImage(
      image.src,
      alt ?? "",
      title ?? "",
      image.processedImage?.base64 ?? fallBackSvg,
      ratio
    );
    if (image.originalImageLink) {
      return (
        <figure className={`relative w-full h-full`}>
          <span className={`relative ${bgImage}`}>
            {image.originalImageLink ? (
              <a
                href={image.originalImageLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {imageElement}
              </a>
            ) : (
              imageElement
            )}
            {image.caption && (
              <figcaption className="text-center text-sm mt-2">
                {image.caption}
              </figcaption>
            )}
          </span>
        </figure>
      );
    }

    return renderImage(src, alt ?? "", title ?? "", fallBackSvg);
  }
}
