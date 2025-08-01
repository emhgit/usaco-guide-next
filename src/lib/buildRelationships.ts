import {
  MdxContent,
  ModuleProblemInfo,
  ModuleProblemLists,
  ProblemInfo,
} from "../types/content";

export function linkProblemsToModules(
  problems: ProblemInfo[],

  modules: MdxContent[],

  moduleProblemLists: ModuleProblemLists[]
): ModuleProblemInfo[] {
  const moduleMap = new Map(modules.map((m) => [m.frontmatter.id, m]));

  const moduleProblemsMap = new Map<string, ModuleProblemInfo[]>();

  // Build map of moduleId → problems

  for (const list of moduleProblemLists) {
    const allProblems = list.problemLists.flatMap((pl) => pl.problems);

    moduleProblemsMap.set(list.moduleId, allProblems);
  }

  // Enhance problems with module references

  return problems.map((problem) => {
    if (problem.inModule) {
      // Find which module contains this problem

      for (const [moduleId, moduleProblems] of moduleProblemsMap) {
        if (moduleProblems.some((p) => p.uniqueId === problem.uniqueId)) {
          return {
            ...problem,

            module: moduleMap.get(moduleId),
          };
        }
      }
    }

    return problem;
  });
}

export function buildModuleProblemLists(
  modules: MdxContent[],

  problems: ProblemInfo[]
): ModuleProblemLists[] {
  return modules.map((module) => {
    const moduleProblems = problems.filter(
      (p) => p.inModule && p.module?.frontmatter.id === module.frontmatter.id
    );

    return {
      moduleId: module.frontmatter.id,

      problemLists: [
        {
          listId: "default",

          problems: moduleProblems.map((p) => ({
            uniqueId: p.uniqueId,

            name: p.name,

            url: p.url,

            source: p.source,

            sourceDescription: p.sourceDescription,

            isStarred: p.isStarred,

            difficulty: p.difficulty,

            tags: p.tags,

            solution: p.solution,
          })),
        },
      ],
    };
  });
}
