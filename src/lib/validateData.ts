import { MdxContent, ProblemInfo, ModuleProblemLists } from "../types/content";

export function validateProblemConsistency(problems: ProblemInfo[]): void {
  const uniqueIdMap = new Map<string, ProblemInfo>();
  const urlMap = new Map<string, string>();
  const urlsThatCanHaveMultipleUniqueIDs = ["https://cses.fi/107/list/"];

  for (const problem of problems) {
    // Validate uniqueId uniqueness
    if (uniqueIdMap.has(problem.uniqueId)) {
      throw new Error(`Duplicate problem uniqueId: ${problem.uniqueId}`);
    }
    uniqueIdMap.set(problem.uniqueId, problem);

    // Validate URL uniqueness (with exceptions)
    if (
      urlMap.has(problem.url) &&
      urlMap.get(problem.url) !== problem.uniqueId &&
      !urlsThatCanHaveMultipleUniqueIDs.includes(problem.url)
    ) {
      throw new Error(
        `URL ${problem.url} is associated with multiple problems: ` +
          `${urlMap.get(problem.url)} and ${problem.uniqueId}`
      );
    }

    urlMap.set(problem.url, problem.uniqueId);

    // Validate inModule consistency
    if (problem.inModule && !problem.module) {
      throw new Error(
        `Problem ${problem.uniqueId} is marked inModule but has no module reference`
      );
    }
  }
}

export function validateModuleProblems(
  modules: MdxContent[],
  moduleProblemLists: ModuleProblemLists[]
): void {
  const moduleIds = new Set(modules.map((m) => m.frontmatter.id));
  for (const list of moduleProblemLists) {
    if (!moduleIds.has(list.moduleId)) {
      throw new Error(
        `ModuleProblemList references non-existent module: ${list.moduleId}`
      );
    }

    for (const problemList of list.problemLists) {
      for (const problem of problemList.problems) {
        if (!problem.uniqueId) {
          throw new Error(
            `Problem in module ${list.moduleId} missing uniqueId`
          );
        }
      }
    }
  }
}

export function validateSolutionRelationships(
  solutions: MdxContent[],
  problems: ProblemInfo[]
): void {
  const problemIds = new Set(problems.map((p) => p.uniqueId));
  const problemIdToSolution = new Map<string, MdxContent>();

  for (const solution of solutions) {
    const problemId = solution.frontmatter.id;
    if (!problemId) {
      throw new Error(
        `Solution at ${solution.fileAbsolutePath} missing problemId in frontmatter`
      );
    }

    if (!problemIds.has(problemId)) {
      throw new Error(`Solution references non-existent problem: ${problemId}`);
    }
    problemIdToSolution.set(problemId, solution);
  }

  // Check problems that claim to have solutions
  for (const problem of problems) {
    if (
      problem.solution?.kind === "internal" &&
      !problemIdToSolution.has(problem.uniqueId)
    ) {
      throw new Error(
        `Problem ${problem.uniqueId} claims to have internal solution but none exists`
      );
    }
  }
}
