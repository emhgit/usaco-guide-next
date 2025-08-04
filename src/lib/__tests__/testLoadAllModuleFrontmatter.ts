import { loadAllModuleFrontmatter } from '../loadContent';

async function test() {
    try {
        console.log('Starting to load frontmatter...');
        const startTime = Date.now();
        const frontmatter = await loadAllModuleFrontmatter();
        const endTime = Date.now();

        console.log(`Took ${(endTime - startTime) / 1000} seconds`);

        frontmatter.slice(0, 3).forEach((frontmatter, i) => {
            console.log(JSON.stringify(frontmatter, null, 2));
        });
    } catch (error) {
        console.error('Error loading frontmatter:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

// Run the test
test();
