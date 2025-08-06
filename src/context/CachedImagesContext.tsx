import * as React from "react";
import { ExtractedImage } from "../lib/parseMdxFile";

const CachedImagesContext = React.createContext<Map<
  string,
  ExtractedImage
> | null>(null);

export const CachedImagesProvider = CachedImagesContext.Provider;

export function useCachedImages() {
  const images = React.useContext(CachedImagesContext);
  if (!images) {
    throw new Error(
      "useCachedImages must be used within a CachedImagesProvider"
    );
  }
  return images;
}
