import path from "path";

export const DATA_DIR = path.join(process.cwd(), "public", "data");
export const SLUG_ID_MAPPING_FILE = path.join(DATA_DIR, "slug-id-mapping.json");
export const CACHED_MODULES_FILE = path.join(DATA_DIR, "cached-modules.json");
export const CACHED_SOLUTIONS_FILE = path.join(DATA_DIR, "cached-solutions.json");
export const CACHED_PROBLEMS_FILE = path.join(DATA_DIR, "cached-problems.json");
export const CACHED_MODULE_PROBLEM_LISTS_FILE = path.join(DATA_DIR, "cached-module-problem-lists.json");
export const CACHED_COW_IMAGES_FILE = path.join(DATA_DIR, "cached-cow-images.json");
export const CACHED_MODULE_FRONTMATTER_FILE = path.join(DATA_DIR, "cached-module-frontmatter.json");
export const CACHED_SOLUTION_FRONTMATTER_FILE = path.join(DATA_DIR, "cached-solution-frontmatter.json");
export const CACHED_IMAGES_FILE = path.join(DATA_DIR, "cached-images.json");
export const USACO_IDS_TO_PROBLEMS_MAP_FILE = path.join(DATA_DIR, "usaco-ids-to-problems-map.json");
export const CACHED_PROBLEM_SLUGS_FILE = path.join(DATA_DIR, "cached-problem-slugs.json");
export const CACHED_USACO_IDS_FILE = path.join(DATA_DIR, "cached-usaco-ids.json");

export const SOLUTIONS_DIR = path.join(process.cwd(), "solutions");
export const CONTENT_DIR = path.join(process.cwd(), "content");
