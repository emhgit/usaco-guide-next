import { loadAllModuleFilePaths } from '../loadContent';

async function test() {
    try {
        console.log('Starting to load module file paths...');
        const startTime = Date.now();
        const moduleFilePaths = await loadAllModuleFilePaths();
        const endTime = Date.now();

        console.log(`Took ${(endTime - startTime) / 1000} seconds`);

        moduleFilePaths.slice(0, 3).forEach((moduleFilePath, i) => {
            console.log(JSON.stringify(moduleFilePath, null, 2));
        });
    } catch (error) {
        console.error('Error loading module file paths:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

// Run the test
test();
