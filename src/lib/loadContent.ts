import path from "path";
import fs from "fs/promises";
import { parseMdxFile } from "./parseMdxFile";
import { linkProblemsToModules } from "./buildRelationships";
import {
  validateProblemConsistency,
  validateModuleProblems,
} from "./validateData";
import {
  MdxContent,
  ProblemInfo,
  ProblemSolutionInfo,
  ModuleProblemInfo,
  ModuleProblemList,
  ModuleProblemLists,
} from "../types/content";
import { moduleIDToSectionMap } from "../../content/ordering";
import { checkInvalidUsacoMetadata, ProblemMetadata } from "@/models/problem";

/**
 * Loads all problem solutions from the solutions directory
 */
async function loadAllSolutions(): Promise<MdxContent[]> {
  const solutionsDir = path.join(process.cwd(), "solutions");
  try {
    const solutionFiles = await fs.readdir(solutionsDir, { recursive: true });
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
 * Validates problem metadata and returns a ProblemInfo object
 */
function createProblemInfo(metadata: any, moduleId?: string): ProblemInfo {
  // Basic validation
  if (!metadata.uniqueId) {
    throw new Error("Problem is missing required field: uniqueId");
  }
  if (!metadata.name) {
    throw new Error(
      `Problem ${metadata.uniqueId} is missing required field: name`
    );
  }
  if (!metadata.url) {
    throw new Error(
      `Problem ${metadata.uniqueId} is missing required field: url`
    );
  }

  // Convert solution to the correct type if it exists
  let solution: ProblemSolutionInfo | undefined;
  if (metadata.solution) {
    if (typeof metadata.solution === "string") {
      solution = {
        kind: "internal",
        url: metadata.solution,
      };
    } else if (metadata.solution.kind) {
      solution = metadata.solution as ProblemSolutionInfo;
    }
  }

  const problemInfo: ProblemInfo = {
    uniqueId: metadata.uniqueId,
    name: metadata.name,
    url: metadata.url,
    source: metadata.source || "Unknown",
    sourceDescription: metadata.sourceDescription,
    isStarred: metadata.isStarred || false,
    difficulty: metadata.difficulty || "Normal",
    tags: metadata.tags || [],
    inModule: !!moduleId,
    solution,
  };

  return problemInfo;
}

/**
 * Loads all problems from JSON files matching *.problems.json or extraProblems.json
 */
async function loadAllProblems(): Promise<{
  problems: ProblemInfo[];
  moduleProblemLists: ModuleProblemLists[];
}> {
  const contentDir = path.join(process.cwd(), "content");
  const allFiles = await fs.readdir(contentDir, { recursive: true });

  const problems: ProblemInfo[] = [];
  const moduleProblemListsMap: Record<string, ModuleProblemList[]> = {};

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
      const content = await fs.readFile(filePath, "utf-8");
      let parsedContent;

      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        throw new Error(`Unable to parse JSON: ${filePath}`);
      }

      const moduleId = parsedContent["MODULE_ID"];
      if (!moduleId) {
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

      // Process each table in the JSON file
      for (const [tableId, tableData] of Object.entries(parsedContent)) {
        if (tableId === "MODULE_ID") continue;

        const problemsList = tableData as any[];
        if (!Array.isArray(problemsList)) {
          console.warn(`Skipping non-array table ${tableId} in ${filePath}`);
          continue;
        }

        const moduleProblems: ModuleProblemInfo[] = [];

        for (const problemData of problemsList) {
          try {
            // Special handling for USACO problems
            if (problemData.uniqueId?.startsWith?.("usaco-")) {
              // Skip USACO problems as they'll be handled separately
              continue;
            }

            const problemInfo = createProblemInfo(problemData, moduleId);
            problems.push(problemInfo);

            if (!isExtraProblems) {
              moduleProblems.push(problemInfo);
            }
          } catch (error) {
            console.error(
              `Error processing problem in ${filePath}, table ${tableId}:`,
              error
            );
            throw error; // Re-throw to fail fast during development
          }
        }

        // Add problems to module's problem list if not extraProblems
        if (!isExtraProblems && moduleId) {
          if (!moduleProblemListsMap[moduleId]) {
            moduleProblemListsMap[moduleId] = [];
          }
          moduleProblemListsMap[moduleId].push({
            listId: tableId,
            problems: moduleProblems,
          });
        }
      }
    } catch (error) {
      console.error(`Error processing problem file ${filePath}:`, error);
      throw error; // Re-throw to fail fast during development
    }
  }

  // Convert the module problem lists map to the expected array format
  const moduleProblemLists: ModuleProblemLists[] = Object.entries(
    moduleProblemListsMap
  ).map(([moduleId, problemLists]) => ({
    moduleId,
    problemLists,
  }));

  return { problems, moduleProblemLists };
}

/**
 * Main function to load all content (modules, problems, solutions) and their relationships
 */
export async function loadContent() {
  // Load all MDX modules
  const contentDir = path.join(process.cwd(), "content");
  const moduleFiles = (
    await fs.readdir(contentDir, { recursive: true })
  ).filter((file: string) => typeof file === "string" && file.endsWith(".mdx"));

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

      const division = moduleIDToSectionMap[moduleId];

      modules.push({
        ...parsed,
        frontmatter: {
          ...parsed.frontmatter,
          division,
        },
        slug: file.replace(/\.mdx$/, ""),
      });
    } catch (error) {
      console.error(`Error loading module ${file}:`, error);
    }
  }

  // Load and validate problems
  const { problems: loadedProblems, moduleProblemLists } =
    await loadAllProblems();

  // Ensure problems have the required inModule property before passing to linkProblemsToModules
  const problemsWithModuleFlag: ProblemInfo[] = loadedProblems.map(
    (problem) => ({
      ...problem,
      inModule: false, // Will be updated by linkProblemsToModules
    })
  );

  const enhancedProblems = linkProblemsToModules(
    problemsWithModuleFlag,
    modules,
    moduleProblemLists
  );

  // Load solutions
  const solutions = await loadAllSolutions();

  // Run validations
  validateProblemConsistency(enhancedProblems);
  validateModuleProblems(modules, moduleProblemLists);

  return {
    modules,
    problems: enhancedProblems,
    moduleProblemLists,
    solutions,
  };
}

export type { MdxContent, ProblemInfo } from "../types/content";
