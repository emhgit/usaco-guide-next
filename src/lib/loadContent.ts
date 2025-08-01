import path from 'path';
import fs from 'fs/promises';
import { parseMdxFile } from './parseMdxFile';
import { buildModuleProblemLists, linkProblemsToModules } from './buildRelationships';
import { validateProblemConsistency, validateModuleProblems } from './validateData';
import { MdxContent, ProblemInfo } from '../types/content';
import { moduleIDToSectionMap } from '../../content/ordering';

/**
 * Loads all problem solutions from the solutions directory
 */
async function loadAllSolutions(): Promise<MdxContent[]> {
    const solutionsDir = path.join(process.cwd(), 'solutions');
    try {
        const solutionFiles = await fs.readdir(solutionsDir);
        const solutions: MdxContent[] = [];

        for (const file of solutionFiles) {
            if (!file.endsWith('.mdx')) continue;

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
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.warn('Solutions directory not found, skipping solutions loading');
            return [];
        }
        throw error;
    }
}

/**
 * Loads all problems from the problems directory
 */
async function loadAllProblems(): Promise<ProblemInfo[]> {
    const problemsDir = path.join(process.cwd(), 'problems');
    try {
        const problemFiles = await fs.readdir(problemsDir);
        const problems: ProblemInfo[] = [];

        for (const file of problemFiles) {
            if (!file.endsWith('.mdx')) continue;

            const filePath = path.join(problemsDir, file);
            try {
                const problem = await parseMdxFile(filePath);

                // Convert to ProblemInfo format
                const problemInfo: ProblemInfo = {
                    uniqueId: problem.frontmatter.id,
                    name: problem.frontmatter.title,
                    url: `/problems/${file.replace(/\.mdx$/, '')}`,
                    source: problem.frontmatter.source || 'Unknown',
                    sourceDescription: problem.frontmatter.description,
                    isStarred: problem.frontmatter.isStarred || false,
                    difficulty: problem.frontmatter.difficulty || 'Normal',
                    tags: problem.frontmatter.tags || [],
                    inModule: false, // Will be updated when linked to modules
                };

                // Handle solution if it exists
                if (problem.frontmatter.solution) {
                    problemInfo.solution = typeof problem.frontmatter.solution === 'string' 
                        ? { kind: 'internal', url: problem.frontmatter.solution }
                        : problem.frontmatter.solution;
                }

                problems.push(problemInfo);
            } catch (error) {
                console.error(`Error loading problem ${file}:`, error);
            }
        }

        return problems;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.warn('Problems directory not found, skipping problems loading');
            return [];
        }
        throw error;
    }
}

/**
 * Main function to load all content (modules, problems, solutions) and their relationships
 */
export async function loadContent() {
    // Load all MDX modules
    const contentDir = path.join(process.cwd(), 'content');
    const moduleFiles = (await fs.readdir(contentDir, { recursive: true }))
        .filter((file: string) => typeof file === 'string' && file.endsWith('.mdx'));

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
            });
        } catch (error) {
            console.error(`Error loading module ${file}:`, error);
        }
    }

    // Load and validate problems
    const problems = await loadAllProblems();
    const moduleProblemLists = buildModuleProblemLists(modules, problems);

    // Ensure problems have the required inModule property before passing to linkProblemsToModules
    const problemsWithModuleFlag: ProblemInfo[] = problems.map(problem => ({
        ...problem,
        inModule: false, // Will be updated by linkProblemsToModules
    }));

    const enhancedProblems = linkProblemsToModules(problemsWithModuleFlag, modules, moduleProblemLists);

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

export type { MdxContent, ProblemInfo } from '../types/content';
