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
/**
 * Loads all problem solutions from the solutions directory
 */
export async function loadAllSolutions(): Promise<Map<string, MdxContent>> {
  const { readdir } = await import("fs/promises");
  const solutionsDir = path.join(process.cwd(), "solutions");
  try {
    const solutionFiles = (await readdir(solutionsDir, { recursive: true })).filter((file) => file.endsWith(".mdx"));
    if (solutionFiles.length === cachedSolutions.size) return cachedSolutions;
    for (const file of solutionFiles) {
      try {
        await loadSolution(file);
      } catch (error) {
        console.error(`Error loading solution ${file}:`, error);
      }
    }
    return cachedSolutions;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn("Solutions directory not found, skipping solutions loading");
      return new Map();
    }
    throw error;
  }
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
  const { readdir, readFile } = await import("fs/promises");
  if (cachedProblems && cachedModuleProblemLists) {
    return {
      problems: cachedProblems,
      moduleProblemLists: cachedModuleProblemLists,
    };
  }

  const contentDir = path.join(process.cwd(), "content");
  const allFiles = await readdir(contentDir, { recursive: true });

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
    const filePath = path.join(contentDir, file);
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
  return { problems, moduleProblemLists };
}

export async function loadModule(fileName: string, id?: string): Promise<MdxContent> {
  if (id && cachedModules.has(id)) return cachedModules.get(id);
  const { parseMdxFile } = await import("./parseMdxFile");

  const filePath = path.join(process.cwd(), "content", fileName);
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

export async function getCachedImages(): Promise<Map<string, ExtractedImage>> {
  return cachedImages;
}

export async function loadAllModules(): Promise<Map<string, MdxContent>> {
  const { readdir } = await import("fs/promises");
  const contentDir = path.join(process.cwd(), "content");
  const moduleFiles = (await readdir(contentDir, { recursive: true })).filter(
    (file: string) => typeof file === "string" && file.endsWith(".mdx")
  );
  if (moduleFiles.length === cachedModules.size) return cachedModules;

  for (const file of moduleFiles) {
    try {
      await loadModule(file);
    } catch (error) {
      console.error(`Error loading module ${file}:`, error);
    }
  }

  return cachedModules;
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
  if (cachedModuleFrontmatter) return cachedModuleFrontmatter;
  const { readdir, readFile } = await import("fs/promises");
  const matter = (await import("gray-matter")).default;
  const contentDir = path.join(process.cwd(), "content");
  const moduleFiles = (await readdir(contentDir, { recursive: true })).filter(
    (file: string) => typeof file === "string" && file.endsWith(".mdx")
  );
  const data: { filePath: string; frontmatter: MdxFrontmatter; division: string }[] = [];

  for (const file of moduleFiles) {
    const filePath = path.join(contentDir, file);
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
  return data;
}

export async function loadAllSolutionFrontmatter(): Promise<
  { filePath: string; frontmatter: MdxFrontmatter }[]
> {
  if (cachedSolutionFrontmatter) return cachedSolutionFrontmatter;
  const { readdir, readFile } = await import("fs/promises");
  const matter = (await import("gray-matter")).default;
  const contentDir = path.join(process.cwd(), "solutions");
  const solutionFiles = (await readdir(contentDir, { recursive: true })).filter(
    (file: string) => typeof file === "string" && file.endsWith(".mdx")
  );
  const data: { filePath: string; frontmatter: MdxFrontmatter }[] = [];

  for (const file of solutionFiles) {
    const filePath = path.join(contentDir, file);
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
  return data;
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
  validateProblemConsistency(loadedProblems);
  validateSolutionRelationships(solutions, loadedProblems);

  return {
    modules,
    problems: loadedProblems,
    moduleProblemLists,
    solutions,
  };
}

export type { MdxContent, ProblemInfo } from "../types/content";
