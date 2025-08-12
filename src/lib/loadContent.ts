import path from "path";
// import { linkProblemsToModules } from "./buildRelationships";
import {
  validateProblemConsistency,
  validateSolutionRelationships,
} from "./validateData";
import {
  MdxContent,
  ProblemInfo,
  ModuleProblemList,
  ModuleProblemLists,
  MdxFrontmatter,
} from "../types/content";
import * as freshOrdering from "../../content/ordering";
import { moduleIDToSectionMap } from "../../content/ordering";
import {
  checkInvalidUsacoMetadata,
  getProblemInfo,
  ProblemMetadata,
} from "../models/problem";
import { ExtractedImage } from "./parseMdxFile";
import {
  CACHED_IMAGES_FILE,
  CACHED_MODULE_FRONTMATTER_FILE,
  CACHED_MODULE_PROBLEM_LISTS_FILE,
  CACHED_MODULES_FILE,
  CACHED_PROBLEMS_FILE,
  CACHED_SOLUTION_FRONTMATTER_FILE,
  CACHED_SOLUTIONS_FILE,
  CONTENT_DIR,
  SOLUTIONS_DIR,
  CACHED_PROBLEM_SLUGS_FILE,
  CACHED_USACO_IDS_FILE
} from "./constants";

let cachedModules: Map<string, MdxContent> = new Map();
let cachedProblems: ProblemInfo[] | null = null;
let cachedModuleProblemLists: ModuleProblemLists[] | null = null;
let cachedSolutions: Map<string, MdxContent> = new Map();
let cachedCowImages: Array<{ name: string; src: string }> | null = null;
let cachedModuleFrontmatter:
  | { filePath: string; frontmatter: MdxFrontmatter; division: string }[]
  | null = null;
let cachedSolutionFrontmatter:
  | { filePath: string; frontmatter: MdxFrontmatter }[]
  | null = null;
let cachedImages: Map<string, ExtractedImage> = new Map();
let cachedProblemSlugs: Map<string, string> | null = null;
let cachedUSACOIds: Set<string> | null = null;
/**
 * Loads all problem solutions from the solutions directory
 */
export async function loadAllSolutions(): Promise<Map<string, MdxContent>> {
  const { readdir, access, readFile } = await import("fs/promises");
  try {
    const solutionFiles = (await readdir(SOLUTIONS_DIR, { recursive: true })).filter((file) => file.endsWith(".mdx"));
    // check in-memory cache first
    if (solutionFiles.length === cachedSolutions.size) return cachedSolutions;

    // Try to load from cache file
    try {
      await access(CACHED_SOLUTIONS_FILE);
      const content = await readFile(CACHED_SOLUTIONS_FILE, "utf-8");
      cachedSolutions = new Map(JSON.parse(content));
      return cachedSolutions;
    } catch (error) {
      // Cache file doesn't exist or is invalid, continue with normal loading
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error reading cache file:', error);
      }
    }

    for (const file of solutionFiles) {
      try {
        await loadSolution(file);
      } catch (error) {
        console.error(`Error loading solution ${file}:`, error);
      }
    }
    await saveFileCache(CACHED_SOLUTIONS_FILE, cachedSolutions);
    await saveFileCache(CACHED_IMAGES_FILE, cachedImages);
    return cachedSolutions;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn("Solutions directory not found, skipping solutions loading");
      return new Map();
    }
    throw error;
  }
}

export async function saveFileCache(filePath: string, data: any) {
  const { writeFile, mkdir } = await import("fs/promises");
  await mkdir(path.dirname(filePath), { recursive: true });
  let dataToWrite = data;
  if (data instanceof Map) {
    dataToWrite = Array.from(data.entries());
  } else if (Array.isArray(data)) {
    // Deep clone to strip class instances / prototype methods
    dataToWrite = JSON.parse(JSON.stringify(data, replacer));
  } else if (data instanceof Set) {
    dataToWrite = Array.from(data);
  }

  try {
    const json = JSON.stringify(dataToWrite);
    await writeFile(filePath, json, "utf8");
  } catch (err) {
    console.error("Failed to stringify data for", filePath, err);
    throw err;
  }
}

function replacer(key: string, value: any) {
  // Remove functions or unserializable objects
  if (typeof value === "function") return undefined;
  return value;
}

export async function loadSolution(fileName: string, id?: string): Promise<MdxContent> {
  if (id && cachedSolutions.has(id)) return cachedSolutions.get(id);
  const { parseMdxFile } = await import("./parseMdxFile");

  const filePath = path.join(process.cwd(), "solutions", fileName);
  const parsed = await parseMdxFile(filePath);

  cachedSolutions.set(parsed.frontmatter.id, parsed);
  parsed.images?.forEach((image) => {
    cachedImages.set(image.src, image);
  });
  return parsed;
}

/**
 * Loads all problems from JSON files matching *.problems.json or extraProblems.json
 */
export async function loadAllProblems(): Promise<{
  problems: ProblemInfo[];
  moduleProblemLists: ModuleProblemLists[];
}> {
  const { readdir, readFile, access } = await import("fs/promises");
  if (cachedProblems && cachedModuleProblemLists) {
    return {
      problems: cachedProblems,
      moduleProblemLists: cachedModuleProblemLists,
    };
  }

  try {
    await access(CACHED_PROBLEMS_FILE);
    const problemsContent = await readFile(CACHED_PROBLEMS_FILE, "utf-8");
    cachedProblems = JSON.parse(problemsContent.trim());
    await access(CACHED_MODULE_PROBLEM_LISTS_FILE);
    const moduleProblemListsContent = await readFile(CACHED_MODULE_PROBLEM_LISTS_FILE, "utf-8");
    cachedModuleProblemLists = JSON.parse(moduleProblemListsContent.trim());
    return {
      problems: cachedProblems,
      moduleProblemLists: cachedModuleProblemLists,
    };
  } catch (error) {
    // Cache file doesn't exist or is invalid, continue with normal loading
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error reading cache file:', error);
    }
  }

  const allFiles = await readdir(CONTENT_DIR, { recursive: true });

  if (cachedModules.size === 0) {
    await loadAllModules();
  }
  const problems: ProblemInfo[] = [];
  const moduleProblemLists: ModuleProblemLists[] = [];

  // Find all relevant JSON files
  const problemFiles = allFiles.filter(
    (file): file is string =>
      typeof file === "string" &&
      (file.endsWith(".problems.json") || file.endsWith("extraProblems.json"))
  );

  for (const file of problemFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    const fileName = path.basename(file);
    const isExtraProblems = fileName === "extraProblems.json";

    try {
      const content = await readFile(filePath, "utf-8");
      let parsedContent;

      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        const hint = filePath ? `file in ${filePath}` : "";
        throw new Error(`Unable to parse JSON: ${hint}`);
      }

      const moduleId: string = parsedContent["MODULE_ID"];
      if (!moduleId && !isExtraProblems) {
        throw new Error(
          `MODULE_ID not found in problem JSON file: ${filePath}`
        );
      }
      // Validate module ID (skip for extraProblems.json)
      if (!isExtraProblems && !(moduleId in moduleIDToSectionMap)) {
        throw new Error(
          `.problems.json moduleId does not correspond to module: '${moduleId}',  path: ${filePath}`
        );
      }

      Object.keys(parsedContent).forEach((tableId) => {
        if (tableId == "MODULE_ID") return;
        try {
          parsedContent[tableId].forEach((metadata: ProblemMetadata) => {
            checkInvalidUsacoMetadata(metadata);
            // if (process.env.CI) stream.write(metadata.uniqueId + "\n");
            const problemInfo = getProblemInfo(metadata);
            let module: MdxContent | null = null;
            module = cachedModules.get(moduleId) || null;
            problems.push({
              ...problemInfo,
              module,
              moduleId: moduleId,
              inModule: true,
            });
          });
        } catch (e) {
          console.error(
            "Failed to create problem info for",
            parsedContent[tableId]
          );
          throw new Error(e.toString());
        }
      });

      if (moduleId) {
        const problemLists: ModuleProblemList[] = Object.keys(parsedContent)
          .filter((x) => x !== "MODULE_ID")
          .map((listId) => ({
            listId,
            problems: parsedContent[listId].map((x) => {
              return {
                ...getProblemInfo(x, freshOrdering),
              };
            }),
          }));
        moduleProblemLists.push({
          problemLists,
          moduleId,
        });
      }
    } catch (error) {
      console.error(`Error processing problem file ${filePath}:`, error);
      throw error; // Re-throw to fail fast during development
    }
  }

  cachedProblems = problems;
  cachedModuleProblemLists = moduleProblemLists;
  await saveFileCache(CACHED_PROBLEMS_FILE, problems);
  await saveFileCache(CACHED_MODULE_PROBLEM_LISTS_FILE, moduleProblemLists);
  return { problems, moduleProblemLists };
}

export async function getCachedImages(): Promise<Map<string, ExtractedImage>> {
  return cachedImages;
}

export async function loadAllModules(): Promise<Map<string, MdxContent>> {
  const { readdir, access, readFile } = await import("fs/promises");
  const moduleFiles = (await readdir(CONTENT_DIR, { recursive: true })).filter(
    (file: string) => typeof file === "string" && file.endsWith(".mdx")
  );
  if (moduleFiles.length === cachedModules.size) return cachedModules;
  try {
    await access(CACHED_MODULES_FILE);
    const content = await readFile(CACHED_MODULES_FILE, "utf-8");
    cachedModules = new Map(JSON.parse(content));
    return cachedModules;
  } catch (error) {
    // Cache file doesn't exist or is invalid, continue with normal loading
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error reading cache file:', error);
    }
  }

  for (const file of moduleFiles) {
    try {
      await loadModule(file);
    } catch (error) {
      console.error(`Error loading module ${file}:`, error);
    }
  }

  await saveFileCache(CACHED_MODULES_FILE, cachedModules);
  await saveFileCache(CACHED_IMAGES_FILE, cachedImages);
  return cachedModules;
}

export async function loadModule(fileName: string, id?: string): Promise<MdxContent> {
  if (id && cachedModules.has(id)) return cachedModules.get(id);
  const { parseMdxFile } = await import("./parseMdxFile");

  const filePath = path.join(CONTENT_DIR, fileName);
  const parsed = await parseMdxFile(filePath);

  if (!(parsed.frontmatter.id in moduleIDToSectionMap)) {
    throw new Error(
      `Module ID does not show up in moduleIDToSectionMap: ${parsed.frontmatter.id}, path: ${filePath}`
    );
  }
  cachedModules.set(parsed.frontmatter.id, parsed);
  parsed.images?.forEach((image) => {
    cachedImages.set(image.src, image);
  });
  return parsed;
}

/**
 * Loads and processes cow images from the assets directory
 * @returns Array of objects containing image data
 */
export async function loadCowImages() {
  if (cachedCowImages) return cachedCowImages;
  const { readdir } = await import("fs/promises");
  const assetsDir = path.join(process.cwd(), "src", "assets");
  const cowImages: Array<{
    name: string;
    src: string;
  }> = [];

  try {
    // Recursively find all image files in the assets directory
    const findImages = async (dir: string, basePath: string = "") => {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          await findImages(fullPath, relativePath);
        } else if (
          entry.isFile() &&
          /cows/i.test(fullPath) && // Check if path contains 'cows' (case insensitive)
          /\.(jpg|jpeg|png|webp|gif)$/i.test(entry.name) // Common image extensions
        ) {
          cowImages.push({
            name: path.parse(entry.name).name,
            src: `/${path
              .relative(process.cwd(), fullPath)
              .replace(/\\/g, "/")}`,
          });
        }
      }
    };

    await findImages(assetsDir);

    // Sort images by name
    cowImages.sort((a, b) => a.name.localeCompare(b.name));

    cachedCowImages = cowImages;
    return cowImages;
  } catch (error) {
    console.error("Error loading cow images:", error);
    return [];
  }
}

export async function loadAllModuleFrontmatter(): Promise<
  { filePath: string; frontmatter: MdxFrontmatter; division: string }[]
> {
  const { readdir, readFile, access } = await import("fs/promises");
  if (cachedModuleFrontmatter) return cachedModuleFrontmatter;
  try {
    await access(CACHED_MODULE_FRONTMATTER_FILE);
    const content = await readFile(CACHED_MODULE_FRONTMATTER_FILE, "utf-8");
    cachedModuleFrontmatter = JSON.parse(content);
    return cachedModuleFrontmatter;
  } catch (error) {
    // Cache file doesn't exist or is invalid, continue with normal loading
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error reading cache file:', error);
    }
  }
  const matter = (await import("gray-matter")).default;
  const moduleFiles = (await readdir(CONTENT_DIR, { recursive: true })).filter(
    (file: string) => typeof file === "string" && file.endsWith(".mdx")
  );
  const data: { filePath: string; frontmatter: MdxFrontmatter; division: string }[] = [];

  for (const file of moduleFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    try {
      const fileContent = await readFile(filePath, "utf-8");
      const { data: frontmatter } = matter(fileContent);

      if (!(frontmatter.id in moduleIDToSectionMap)) {
        throw new Error(
          `Module ID does not show up in moduleIDToSectionMap: ${frontmatter.id}, path: ${filePath}`
        );
      }

      const division = moduleIDToSectionMap[frontmatter.id];

      data.push({
        filePath: file,
        frontmatter: frontmatter as MdxFrontmatter,
        division
      });
    } catch (error) {
      console.error(`Error loading module ${file}:`, error);
    }
  }

  cachedModuleFrontmatter = data;
  await saveFileCache(CACHED_MODULE_FRONTMATTER_FILE, data);
  return data;
}

export async function loadAllSolutionFrontmatter(): Promise<
  { filePath: string; frontmatter: MdxFrontmatter }[]
> {
  const { readdir, readFile, access } = await import("fs/promises");
  if (cachedSolutionFrontmatter) return cachedSolutionFrontmatter;
  try {
    await access(CACHED_SOLUTION_FRONTMATTER_FILE);
    const content = await readFile(CACHED_SOLUTION_FRONTMATTER_FILE, "utf-8");
    cachedSolutionFrontmatter = JSON.parse(content);
    return cachedSolutionFrontmatter;
  } catch (error) {
    // Cache file doesn't exist or is invalid, continue with normal loading
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error reading cache file:', error);
    }
  }
  const matter = (await import("gray-matter")).default;
  const solutionFiles = (await readdir(SOLUTIONS_DIR, { recursive: true })).filter(
    (file: string) => typeof file === "string" && file.endsWith(".mdx")
  );
  const data: { filePath: string; frontmatter: MdxFrontmatter }[] = [];

  for (const file of solutionFiles) {
    const filePath = path.join(SOLUTIONS_DIR, file);
    try {
      const fileContent = await readFile(filePath, "utf-8");
      const { data: frontmatter } = matter(fileContent);
      data.push({
        filePath: file,
        frontmatter: frontmatter as MdxFrontmatter,
      });
    } catch (error) {
      console.error(`Error loading solution ${file}:`, error);
    }
  }

  cachedSolutionFrontmatter = data;
  await saveFileCache(CACHED_SOLUTION_FRONTMATTER_FILE, data);
  return data;
}

export async function loadAllProblemSlugs(): Promise<Map<string, string>> {
  const { access, readFile } = await import("fs/promises");
  if (cachedProblemSlugs) return cachedProblemSlugs;
  try {
    await access(CACHED_PROBLEM_SLUGS_FILE);
    const content = await readFile(CACHED_PROBLEM_SLUGS_FILE, "utf-8");
    cachedProblemSlugs = new Map(JSON.parse(content));
    return cachedProblemSlugs;
  } catch (error) {
    // Cache file doesn't exist or is invalid, continue with normal loading
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error reading cache file:', error);
    }
  }
  return cachedProblemSlugs;
}

export async function loadAllUSACOIds(): Promise<Set<string>> {
  const { access, readFile } = await import("fs/promises");
  if (cachedUSACOIds) return cachedUSACOIds;
  try {
    await access(CACHED_USACO_IDS_FILE);
    const content = await readFile(CACHED_USACO_IDS_FILE, "utf-8");
    cachedUSACOIds = new Set(JSON.parse(content));
    return cachedUSACOIds;
  } catch (error) {
    // Cache file doesn't exist or is invalid, continue with normal loading
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error reading cache file:', error);
    }
  }
  return cachedUSACOIds;
}
/**
 * Main function to load all content (modules, problems, solutions) and their relationships
 */
export async function loadContent() {
  // Load all MDX modules
  const modules = await loadAllModules();

  // Load solutions
  const solutions = await loadAllSolutions();
  // Load and validate problems
  const { problems: loadedProblems, moduleProblemLists } =
    await loadAllProblems();

  // Run validations
  const { problemSlugs, usacoIds } = validateProblemConsistency(loadedProblems);
  validateSolutionRelationships(solutions, loadedProblems);

  cachedProblemSlugs = problemSlugs;
  cachedUSACOIds = usacoIds;
  saveFileCache(CACHED_PROBLEM_SLUGS_FILE, problemSlugs);
  saveFileCache(CACHED_USACO_IDS_FILE, usacoIds);

  return {
    modules,
    problems: loadedProblems,
    moduleProblemLists,
    solutions,
    usacoIds,
    problemSlugs,
  };
}

export type { MdxContent, ProblemInfo } from "../types/content";
