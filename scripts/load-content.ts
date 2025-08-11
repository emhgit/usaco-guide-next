import { loadContent } from "../src/lib/loadContent";

async function load() {
  try {
    console.log("Starting to load content...");
    const startTime = Date.now();

    await loadContent();
    const endTime = Date.now();

    console.log("\n=== Content Loaded Successfully ===");
    console.log(`Took ${(endTime - startTime) / 1000} seconds`);
  } catch (error) {
    console.error("Error loading content:");
    console.error(error);
  } finally {
    // Ensure the process exits, but give time for logs to flush
    setTimeout(() => process.exit(0), 100);
  }
}

load();
