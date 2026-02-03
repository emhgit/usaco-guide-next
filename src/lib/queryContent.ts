import { getDatabase } from "./database";
import { MdxContent, ProblemInfo, MdxFrontmatter, ModuleProblemLists } from "../types/content";

/**
 * Query solution by ID
 */
export async function querySolution(id: string): Promise<MdxContent | null> {
  const db = await getDatabase();
  const row = db
    .prepare("SELECT * FROM mdx_content WHERE id = ? AND type = ?")
    .get(id, "solution") as any;

  if (!row) return null;

  return deserializeMdxContent(row);
}

/**
 * Query module by ID
 */
export async function queryModule(id: string): Promise<MdxContent | null> {
  const db = await getDatabase();
  const row = db
    .prepare("SELECT * FROM mdx_content WHERE id = ? AND type = ?")
    .get(id, "module") as any;

  if (!row) return null;

  return deserializeMdxContent(row);
}

export async function queryModuleProblemsLists(id: string): Promise<ModuleProblemLists | null> {
  const db = await getDatabase();
  const rows = db
    .prepare("SELECT list_id, problems_json FROM module_problem_lists WHERE module_id = ?")
    .all(id) as any[];

  if (rows.length === 0) return null;

  const problemLists = rows.map((row) => ({
    listId: row.list_id,
    problems: JSON.parse(row.problems_json) as ProblemInfo[],
  }));

  return {
    moduleId: id,
    problemLists,
  };
}

/**
 * Query problem by unique ID
 */
export async function queryProblem(
  uniqueId: string,
): Promise<ProblemInfo | null> {
  const db = await getDatabase();
  const row = db
    .prepare("SELECT problem_data_json FROM problems WHERE unique_id = ?")
    .get(uniqueId) as any;

  if (!row) return null;

  const problem: ProblemInfo = JSON.parse(row.problem_data_json);

  // Load module if module_id exists
  if (problem.moduleId) {
    const module = await queryModule(problem.moduleId);
    problem.module = module || undefined;
  }

  return problem;
}

/**
 * Query all problems (for getStaticPaths)
 */
export async function queryAllProblems(): Promise<ProblemInfo[]> {
  const db = await getDatabase();
  const rows = db
    .prepare("SELECT problem_data_json FROM problems")
    .all() as any[];

  return rows.map((row) => JSON.parse(row.problem_data_json));
}

/**
 * Query all problems (for getStaticPaths)
 */
export async function queryAllProblemIds(): Promise<string[]> {
    const db = await getDatabase();
    const rows = db
      .prepare("SELECT unique_id FROM problems")
      .all() as any[];
  
    return rows.map((row) => row.unique_id);
  }

/**
 * Query problems by module ID
 */
export async function queryProblemsByModule(
  moduleId: string,
): Promise<ProblemInfo[]> {
  const db = await getDatabase();
  const rows = db
    .prepare("SELECT problem_data_json FROM problems WHERE module_id = ?")
    .all(moduleId) as any[];

  return rows.map((row) => JSON.parse(row.problem_data_json));
}

/**
 * Query all module frontmatter
 */
export async function queryAllModuleFrontmatter(): Promise<
  Array<{ filePath: string; frontmatter: MdxFrontmatter; division: string }>
> {
  const db = await getDatabase();
  const rows = db.prepare("SELECT * FROM module_frontmatter").all() as any[];

  return rows.map((row) => ({
    filePath: row.file_path,
    frontmatter: JSON.parse(row.frontmatter_json),
    division: row.division,
  }));
}

/**
 * Query all solution frontmatter
 */
export async function queryAllSolutionFrontmatter(): Promise<
  Array<{ filePath: string; frontmatter: MdxFrontmatter }>
> {
  const db = await getDatabase();
  const rows = db.prepare("SELECT * FROM solution_frontmatter").all() as any[];

  return rows.map((row) => ({
    filePath: row.file_path,
    frontmatter: JSON.parse(row.frontmatter_json),
  }));
}

/**
 * Deserialize MdxContent from database row
 */
function deserializeMdxContent(row: any): MdxContent {
  return {
    body: row.body,
    fileAbsolutePath: row.file_path, // Note: may need to resolve to absolute
    frontmatter: JSON.parse(row.frontmatter_json),
    toc: JSON.parse(row.toc_json),
    cppOc: row.cpp_oc,
    javaOc: row.java_oc,
    pyOc: row.py_oc,
    mdast: row.mdast_json ? JSON.parse(row.mdast_json) : undefined,
    fields: {
      division: row.division || null,
      gitAuthorTime: row.git_author_time || null,
    },
  };
}

/**
 * Deserialize lightweight MdxContent from database row (without body, toc, mdast)
 * Used for listing pages where full content is not needed
 */
function deserializeMdxContentLight(row: any): MdxContent {
  return {
    body: "", // Empty body for listing pages
    fileAbsolutePath: row.file_path,
    frontmatter: JSON.parse(row.frontmatter_json),
    toc: { cpp: [], java: [], py: [] }, // Empty TOC for listing pages
    cppOc: row.cpp_oc,
    javaOc: row.java_oc,
    pyOc: row.py_oc,
    mdast: null, // No mdast for listing pages
    fields: {
      division: row.division || null,
      gitAuthorTime: row.git_author_time || null,
    },
  };
}

/**
 * Query all problems with the same unique ID
 * Used for modulesThatHaveProblem - finds all modules that contain a problem
 * Since a problem can appear in multiple modules, we need to find all module_problem_lists
 * that contain this problem and create a ProblemInfo for each occurrence
 */
export async function queryAllProblemsWithUniqueId(
  uniqueId: string,
): Promise<ProblemInfo[]> {
  const db = await getDatabase();
  
  // First, get the base problem data
  const problemRow = db
    .prepare("SELECT problem_data_json FROM problems WHERE unique_id = ?")
    .get(uniqueId) as any;

  if (!problemRow) return [];

  const baseProblem: ProblemInfo = JSON.parse(problemRow.problem_data_json);
  const problems: ProblemInfo[] = [];

  // Find all modules that contain this problem by querying module_problem_lists
  const moduleListRows = db
    .prepare(`
      SELECT module_id, list_id, problems_json 
      FROM module_problem_lists
    `)
    .all() as any[];

  // Check each module's problem lists to see if they contain this problem
  for (const row of moduleListRows) {
    const problemList: ProblemInfo[] = JSON.parse(row.problems_json);
    const hasProblem = problemList.some((p) => p.uniqueId === uniqueId);
    
    if (hasProblem) {
      // Create a ProblemInfo for this module occurrence
      const problem: ProblemInfo = {
        ...baseProblem,
        moduleId: row.module_id,
        inModule: true,
      };
      
      // Load the module
      const module = await queryModule(row.module_id);
      if (module) {
        problem.module = module;
      }
      
      problems.push(problem);
    }
  }

  // If no modules found but problem exists, return at least one instance
  if (problems.length === 0) {
    problems.push(baseProblem);
  }

  return problems;
}

/**
 * Query all problem slugs (slug -> unique_id mapping)
 * Returns a Map of slug to unique_id
 */
export async function queryAllProblemSlugs(): Promise<Map<string, string>> {
  const db = await getDatabase();
  const rows = db
    .prepare("SELECT slug, unique_id FROM problem_slugs")
    .all() as any[];

  const slugMap = new Map<string, string>();
  for (const row of rows) {
    slugMap.set(row.slug, row.unique_id);
  }

  return slugMap;
}

/**
 * Query module problem lists by module ID
 */
export async function queryModuleProblemListsByModuleId(
  moduleId: string,
): Promise<ModuleProblemLists | null> {
  const db = await getDatabase();
  const rows = db
    .prepare("SELECT list_id, problems_json FROM module_problem_lists WHERE module_id = ?")
    .all(moduleId) as any[];

  if (rows.length === 0) return null;

  const problemLists = rows.map((row) => ({
    listId: row.list_id,
    problems: JSON.parse(row.problems_json) as ProblemInfo[],
  }));

  return {
    moduleId,
    problemLists,
  };
}

/**
 * Query modules by division
 * Returns an object mapping module IDs to MdxContent for the given division
 * Optimized to exclude large fields (body, toc, mdast) for listing pages
 */
export async function queryModulesByDivision(
  division: string,
): Promise<{ [key: string]: MdxContent }> {
  const db = await getDatabase();
  // Only select fields needed for listing pages to reduce payload size
  const rows = db
    .prepare(`
      SELECT 
        id,
        file_path,
        frontmatter_json,
        cpp_oc,
        java_oc,
        py_oc,
        division,
        git_author_time
      FROM mdx_content 
      WHERE division = ? AND type = ?
    `)
    .all(division, "module") as any[];

  const result: { [key: string]: MdxContent } = {};
  for (const row of rows) {
    const content = deserializeMdxContentLight(row);
    result[content.frontmatter.id] = content;
  }

  return result;
}

/**
 * Query problem IDs by division
 * Returns an array of unique problem IDs for problems in modules of the given division
 */
export async function queryProblemIdsByDivision(
  division: string,
): Promise<string[]> {
  const db = await getDatabase();
  // Join problems with module_frontmatter to get division
  const rows = db
    .prepare(`
      SELECT DISTINCT p.unique_id 
      FROM problems p
      INNER JOIN module_frontmatter mf ON p.module_id = mf.module_id
      WHERE mf.division = ? AND p.in_module = 1
    `)
    .all(division) as any[];

  return rows.map((row) => row.unique_id);
}