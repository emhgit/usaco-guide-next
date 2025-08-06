import { loadAllModuleFrontmatter } from '../loadContent';

async function test() {
    try {
        console.log('Starting to load module frontmatter...');
        const startTime = Date.now();
        const moduleFrontmatter = await loadAllModuleFrontmatter();
        const endTime = Date.now();

        console.log(`Took ${(endTime - startTime) / 1000} seconds`);

        moduleFrontmatter.slice(0, 3).forEach((moduleFrontmatter, i) => {
            console.log(JSON.stringify(moduleFrontmatter, null, 2));
        });
    } catch (error) {
        console.error('Error loading module frontmatter:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

// Run the test
test();
