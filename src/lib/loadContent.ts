import path from "path";
import fs from "fs/promises";
import { parseMdxFile } from "./parseMdxFile";
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
} from "../types/content";
import * as freshOrdering from '../../content/ordering';
import { moduleIDToSectionMap } from "../../content/ordering";
import { checkInvalidUsacoMetadata, getProblemInfo, ProblemMetadata } from "../models/problem";

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
 * Loads all problems from JSON files matching *.problems.json or extraProblems.json
 */
async function loadAllProblems(): Promise<{
  problems: ProblemInfo[];
  moduleProblemLists: ModuleProblemLists[];
}> {
  const contentDir = path.join(process.cwd(), "content");
  const allFiles = await fs.readdir(contentDir, { recursive: true });

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
      const content = await fs.readFile(filePath, "utf-8");
      let parsedContent;

      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        const hint = filePath ? `file in ${filePath}` : '';
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
            problems: parsedContent[listId].map(x => {
              return {
                ...getProblemInfo(x, freshOrdering)
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

  /* Ensure problems have the required inModule property before passing to linkProblemsToModules
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
  */

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

export type { MdxContent, ProblemInfo } from "../types/content";
