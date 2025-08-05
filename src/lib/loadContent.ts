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

let cachedModules: MdxContent[] | null = null;
let cachedProblems: ProblemInfo[] | null = null;
let cachedModuleProblemLists: ModuleProblemLists[] | null = null;
let cachedSolutions: MdxContent[] | null = null;
let cachedCowImages: Array<{ name: string; src: string }> | null = null;
let cachedFrontmatter:
  | { filePath: string; frontmatter: MdxFrontmatter; division: string }[]
  | null = null;
/**
 * Loads all problem solutions from the solutions directory
 */
export async function loadAllSolutions(): Promise<MdxContent[]> {
  if (cachedSolutions) return cachedSolutions;
  const { parseMdxFile } = await import("./parseMdxFile");
  const { readdir } = await import("fs/promises");
  const solutionsDir = path.join(process.cwd(), "solutions");
  try {
    const solutionFiles = await readdir(solutionsDir, { recursive: true });
    const solutions: MdxContent[] = [];

    for (const file of solutionFiles) {
      if (!file.endsWith(".mdx")) continue;

      const filePath = path.join(solutionsDir, file);
      try {
        const solution = await parseMdxFile(filePath);
        solutions.push(solution);
      } catch (error) {
        console.error(`Error loading solution ${file}:`, error);
      }
    }
    cachedSolutions = solutions;
    return solutions;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn("Solutions directory not found, skipping solutions loading");
      return [];
    }
    throw error;
  }
}

/**
 * Loads all problems from JSON files matching *.problems.json or extraProblems.json
 */
export async function loadAllProblems(): Promise<{
  problems: ProblemInfo[];
  moduleProblemLists: ModuleProblemLists[];
}> {
  if (cachedProblems && cachedModuleProblemLists)
    return {
      problems: cachedProblems,
      moduleProblemLists: cachedModuleProblemLists,
    };
  const { readdir, readFile } = await import("fs/promises");
  const contentDir = path.join(process.cwd(), "content");
  const allFiles = await readdir(contentDir, { recursive: true });

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

      const moduleId = parsedContent["MODULE_ID"];
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
            problems.push({
              ...problemInfo,
              module: moduleId,
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

export async function loadModule(slug: string): Promise<MdxContent> {
  const { parseMdxFile } = await import("./parseMdxFile");

  const filePath = path.join(process.cwd(), "content", `${slug}.mdx`);
  const parsed = await parseMdxFile(filePath);
  return {
    ...parsed,
    slug,
  };
}

export async function loadAllModules(): Promise<MdxContent[]> {
  if (cachedModules) return cachedModules;
  const { parseMdxFile } = await import("./parseMdxFile");
  const { readdir } = await import("fs/promises");
  const contentDir = path.join(process.cwd(), "content");
  const moduleFiles = (await readdir(contentDir, { recursive: true })).filter(
    (file: string) => typeof file === "string" && file.endsWith(".mdx")
  );

  const modules: MdxContent[] = [];

  for (const file of moduleFiles) {
    const filePath = path.join(contentDir, file);
    try {
      const parsed = await parseMdxFile(filePath);
      const moduleId = parsed.frontmatter.id;

      if (!(moduleId in moduleIDToSectionMap)) {
        throw new Error(
          `Module ID does not show up in moduleIDToSectionMap: ${moduleId}, path: ${filePath}`
        );
      }

      modules.push({
        ...parsed,
        slug: parsed.frontmatter.id,
      });
    } catch (error) {
      console.error(`Error loading module ${file}:`, error);
    }
  }

  cachedModules = modules;
  return modules;
}

/**
 * Main function to load all content (modules, problems, solutions) and their relationships
 */
export async function loadContent() {
  if (
    cachedModules &&
    cachedProblems &&
    cachedModuleProblemLists &&
    cachedSolutions
  ) {
    return {
      modules: cachedModules,
      problems: cachedProblems,
      moduleProblemLists: cachedModuleProblemLists,
      solutions: cachedSolutions,
    };
  }
  // Load all MDX modules
  const modules = await loadAllModules();
  // Load and validate problems
  const { problems: loadedProblems, moduleProblemLists } =
    await loadAllProblems();

  // Load solutions
  const solutions = await loadAllSolutions();

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
  if (cachedFrontmatter) return cachedFrontmatter;
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
        filePath: file.replace(/\.mdx$/, ""),
        frontmatter: frontmatter as MdxFrontmatter,
        division
      });
    } catch (error) {
      console.error(`Error loading module ${file}:`, error);
    }
  }

  cachedFrontmatter = data;
  return data;
}


export type { MdxContent, ProblemInfo } from "../types/content";
