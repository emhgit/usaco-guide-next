import { loadAllModules } from '../loadContent';

async function test() {
    try {
        console.log('Starting to load modules...');
        const startTime = Date.now();
        const modules = await loadAllModules();
        const endTime = Date.now();

        console.log(`Took ${(endTime - startTime) / 1000} seconds`);

        // Log summary of loaded content
        console.log('\n=== Modules ===');
        console.log(`Loaded ${modules.size} modules`);
        const modulesArray = Array.from(modules.values());
        for (let i = 0; i < 2; i++) {
            console.log("Loaded " + modulesArray[i].frontmatter.id + " " + modulesArray[i].frontmatter.division);
        }
        console.log(`  ... and ${modules.size - 3} more`);
    } catch (error) {
        console.error('Error loading modules:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

// Run the test
test();
