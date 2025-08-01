import { loadContent } from '../src/lib/loadContent';

// set `module: commonjs` and `moduleResolution: Node` in in `tsconfig.json`
async function testLoadContent() {
    try {
        console.log('Starting to load content...');
        const startTime = Date.now();

        const content = await loadContent();
        const endTime = Date.now();

        console.log('\n=== Content Loaded Successfully ===');
        console.log(`Took ${(endTime - startTime) / 1000} seconds`);

        // Log summary of loaded content
        console.log('\n=== Modules ===');
        console.log(`Loaded ${content.modules.length} modules`);
        content.modules.slice(0, 3).forEach((module, i) => {
            console.log(`  ${i + 1}. ${module.frontmatter.title} (${module.frontmatter.division})`);
        });
        if (content.modules.length > 3) {
            console.log(`  ... and ${content.modules.length - 3} more`);
        }

        console.log('\n=== Problems ===');
        console.log(`Loaded ${content.problems.length} problems`);
        content.problems.slice(0, 3).forEach((problem, i) => {
            console.log(`  ${i + 1}. ${problem.name} (${problem.difficulty || 'No difficulty'})`);
        });
        if (content.problems.length > 3) {
            console.log(`  ... and ${content.problems.length - 3} more`);
        }

        console.log('\n=== Module Problem Lists ===');
        console.log(`Found ${content.moduleProblemLists.length} module problem lists`);
        content.moduleProblemLists.slice(0, 3).forEach((list, i) => {
            const problemCount = list.problemLists.reduce((sum, pl) => sum + pl.problems.length, 0);
            console.log(`  ${i + 1}. Module ${list.moduleId}: ${problemCount} problems`);
        });
        if (content.moduleProblemLists.length > 3) {
            console.log(`  ... and ${content.moduleProblemLists.length - 3} more`);
        }

        console.log('\n=== Solutions ===');
        console.log(`Loaded ${content.solutions.length} solutions`);
        content.solutions.slice(0, 3).forEach((solution, i) => {
            console.log(`  ${i + 1}. ${solution.frontmatter.title} (${solution.frontmatter.division}) (${solution.frontmatter.source})`);
        });
        if (content.solutions.length > 3) {
            console.log(`  ... and ${content.solutions.length - 3} more`);
        }
    } catch (error) {
        console.error('Error loading content:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

// Run the test
testLoadContent();
