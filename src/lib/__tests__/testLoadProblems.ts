import { loadAllProblems } from "../loadContent";

async function test() {
  try {
    console.log("Starting to load problems...");
    const startTime = Date.now();
    const { problems, moduleProblemLists } = await loadAllProblems();
    const endTime = Date.now();
    console.log(`Took ${(endTime - startTime) / 1000} seconds`);
    console.log(problems[0]);
    console.log(moduleProblemLists[0]);
  } catch (error) {
    console.error("Error loading problems:");
    console.error(error);
  } finally {
    // Ensure the process exits, but give time for logs to flush
    setTimeout(() => process.exit(0), 100);
  }
}

// Run the test
test();
