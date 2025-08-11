import path from "path";
import fs from "fs/promises";
import { parseMdxFile } from "../parseMdxFile";

// set `module: commonjs` and `moduleResolution: Node` in in `tsconfig.json`
async function test() {
  try {
    console.log("Starting to load content...");
    const startTime = Date.now();
    const filePath = path.join(
      process.cwd(),
      "content\\2_Bronze\\Intro_Complete.mdx"
    );
    const content = await parseMdxFile(filePath);
    const endTime = Date.now();

    console.log(`Took ${(endTime - startTime) / 1000} seconds`);
    // console.log(JSON.stringify(content, null, 2));
    fs.writeFile(
      process.cwd() + "/content.json",
      JSON.stringify(content, null, 2)
    );
  } catch (error) {
    console.error("Error loading content:");
    console.error(error);
  } finally {
    // Ensure the process exits, but give time for logs to flush
    setTimeout(() => process.exit(0), 100);
  }
}

// Run the test
test();
