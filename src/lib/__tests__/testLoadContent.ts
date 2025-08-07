import { loadContent } from '../loadContent';

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
        console.log(`Loaded ${content.modules.size} modules`);
        const modulesArray = Array.from(content.modules.values());
        for (let i = 0; i < 2; i++) {
            console.log("Loaded " + modulesArray[i].frontmatter.id + " " + modulesArray[i].frontmatter.division);
        }
        console.log(`  ... and ${content.modules.size - 3} more`);

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
        console.log(`Loaded ${content.solutions.size} solutions`);
        const solutionsArray = Array.from(content.solutions.values());
        for (let i = 0; i < 2; i++) {
            console.log("Loaded " + solutionsArray[i].frontmatter.id + " " + solutionsArray[i].frontmatter.division);
        }
        if (content.solutions.size > 3) {
            console.log(`  ... and ${content.solutions.size - 3} more`);
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
