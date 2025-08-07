import { moduleIDToSectionMap } from "../../content/ordering";
import {
  AlgoliaEditorFile,
  AlgoliaEditorModuleFile,
  AlgoliaEditorSolutionFile,
} from "../models/algoliaEditorFile";
import { AlgoliaProblemInfo } from "../models/problem";
import { MdxContent, ProblemInfo } from "../types/content";
import extractSearchableText from "./extract-searchable-text";

export async function getAlgoliaRecords() {
  // Fetch data directly instead of using GraphQL
  const { loadContent } = await import("../lib/loadContent");
  const { modules, problems, solutions } = await loadContent();

  // Transform data into Algolia records
  const moduleRecords = modules
    .values()
    .filter((m) => m.frontmatter.id in moduleIDToSectionMap)
    .map((m) => ({
      objectID: m.frontmatter.id,
      ...m.frontmatter,
      ...m.fields,
      content: extractSearchableText(JSON.parse(m.mdast)),
    }));

  const moduleFiles = modules.values();
  const solutionFiles = solutions.values();
  const files = { modules: moduleFiles, solutions: solutionFiles };
  const problemRecords = transformProblems(problems);
  const fileRecords = transformFiles(files, problems);

  return [
    {
      records: moduleRecords,
      indexName: (process.env.ALGOLIA_INDEX_NAME ?? "dev") + "_modules",
      matchFields: ["title", "description", "content", "id", "division"],
    },
    {
      records: problemRecords,
      indexName: (process.env.ALGOLIA_INDEX_NAME ?? "dev") + "_problems",
      matchFields: [
        "source",
        "name",
        "tags",
        "url",
        "difficulty",
        "isStarred",
        "tags",
        "problemModules",
        "solution",
      ],
    },
    {
      records: fileRecords,
      indexName: (process.env.ALGOLIA_INDEX_NAME ?? "dev") + "_editorFiles",
      matchFields: [
        "kind",
        "title",
        "id",
        "source",
        "solutions",
        "path",
        "problemModules",
      ],
    },
  ];
}

function transformProblems(problems: ProblemInfo[]): AlgoliaProblemInfo[] {
  const res: AlgoliaProblemInfo[] = [];

  problems.forEach((p) => {
    const existingProblem = res.find((x) => x.objectID === p.uniqueId);
    const moduleInfo = p.module
      ? {
        id: p.module.frontmatter.id,
        title: p.module.frontmatter.title,
      }
      : null;

    if (existingProblem) {
      existingProblem.tags = [
        ...new Set([...existingProblem.tags, ...(p.tags || [])]),
      ];
      if (
        moduleInfo &&
        !existingProblem.problemModules.find(
          (module) => module.id === moduleInfo.id
        )
      ) {
        existingProblem.problemModules.push(moduleInfo);
      }
    } else {
      res.push({
        objectID: p.uniqueId,
        name: p.name,
        source: p.source,
        tags: p.tags || [],
        url: p.url,
        difficulty: p.difficulty,
        isStarred: p.isStarred,
        solution: p.solution
          ? (Object.fromEntries(
            Object.entries(p.solution).filter(([_, v]) => v != null)
          ) as any)
          : null,
        problemModules: moduleInfo ? [moduleInfo] : [],
      });
    }
  });

  return res;
}

function transformFiles(
  data: {
    modules: MapIterator<MdxContent>,
    solutions: MapIterator<MdxContent>
  },
  problems: ProblemInfo[]
): AlgoliaEditorFile[] {
  const moduleFiles: AlgoliaEditorModuleFile[] = Array.from(data.modules).map((m) => ({
    title: m.frontmatter.title,
    id: m.frontmatter.id,
    path: m.fileAbsolutePath,
  }));

  const solutionFiles: AlgoliaEditorSolutionFile[] = [];

  problems.forEach((problem) => {
    const module = moduleFiles.find(
      (file) => file.id === problem.module?.frontmatter.id
    );
    const relativePath = Array.from(data.solutions).find(
      (fileNode) =>
        fileNode.frontmatter.id === problem.uniqueId
    )?.fileAbsolutePath;
    // might need to convert fileAbsolutePath to relativePath

    const file: AlgoliaEditorSolutionFile = solutionFiles.find(
      (file) => file.id === problem.uniqueId
    ) || {
      id: problem.uniqueId,
      title: problem.name,
      source: problem.source,
      solutions: [],
      path: relativePath ? `solutions/${relativePath}` : null,
      problemModules: [],
    };

    if (solutionFiles.indexOf(file) !== -1) {
      solutionFiles.splice(solutionFiles.indexOf(file), 1);
    }

    if (module != null) {
      file.problemModules.push(module);
    }

    if (problem.solution != null) {
      file.solutions.push({ ...problem.solution });
    }

    solutionFiles.push(file);
  });

  return [
    ...moduleFiles.map<
      { kind: "module"; objectID: string } & AlgoliaEditorModuleFile
    >((x) => ({
      ...x,
      kind: "module",
      objectID: x.id,
    })),
    ...solutionFiles.map<
      { kind: 'solution'; objectID: string } & AlgoliaEditorSolutionFile
    >(x => ({
      ...x,
      kind: 'solution',
      objectID: x.id,
    })),
  ];
}

export default getAlgoliaRecords;
