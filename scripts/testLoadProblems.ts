import path from 'path';
import { loadAllProblems } from '../src/lib/loadContent';

// set `module: commonjs` and `moduleResolution: Node` in in `tsconfig.json`
async function test() {
    try {
        console.log('Starting to load problems...');
        const startTime = Date.now();
        const problems = await loadAllProblems();
        const endTime = Date.now();

        console.log(`Took ${(endTime - startTime) / 1000} seconds`);

        problems.problems.slice(0, 3).forEach((problem, i) => {
            console.log(JSON.stringify(problem, null, 2));
        });
    } catch (error) {
        console.error('Error loading problems:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

// Run the test
test();
