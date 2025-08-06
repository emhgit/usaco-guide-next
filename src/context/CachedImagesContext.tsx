import * as React from "react";
import { ExtractedImage } from "../lib/parseMdxFile";

type CachedImagesType = Map<string, ExtractedImage>;

const CachedImagesContext = React.createContext<CachedImagesType | null>(null);

interface CachedImagesProviderProps {
  children: React.ReactNode;
  value: string; // JSON string of Map entries
}

export function CachedImagesProvider({ children, value }: CachedImagesProviderProps) {
  const imagesMap = React.useMemo(() => {
    try {
      const entries = JSON.parse(value);
      return new Map(entries);
    } catch (e) {
      console.error("Failed to parse cachedImages:", e);
      return new Map();
    }
  }, [value]);

  return (
    <CachedImagesContext.Provider value={imagesMap}>
      {children}
    </CachedImagesContext.Provider>
  );
}

export function useCachedImages() {
  const images = React.useContext(CachedImagesContext);
  if (!images) {
    throw new Error(
      "useCachedImages must be used within a CachedImagesProvider"
    );
  }
  return images;
}
