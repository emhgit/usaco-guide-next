import Database from 'better-sqlite3';
import { getWritableDatabase } from '../src/lib/database';
import { MdxContent, ProblemInfo, MdxFrontmatter } from '../src/types/content';
import path from 'path';

function createSchema(db: Database.Database): void {
  // Drop existing tables if rebuilding
  db.exec(`
    DROP TABLE IF EXISTS mdx_content;
    DROP TABLE IF EXISTS problems;
    DROP TABLE IF EXISTS module_problem_lists;
    DROP TABLE IF EXISTS module_frontmatter;
    DROP TABLE IF EXISTS solution_frontmatter;
    DROP TABLE IF EXISTS problem_slugs;
    DROP TABLE IF EXISTS usaco_ids;
  `);

  // Create tables
  db.exec(`
    CREATE TABLE mdx_content (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      frontmatter_json TEXT NOT NULL,
      body TEXT NOT NULL,
      toc_json TEXT NOT NULL,
      mdast_json TEXT,
      cpp_oc INTEGER NOT NULL DEFAULT 0,
      java_oc INTEGER NOT NULL DEFAULT 0,
      py_oc INTEGER NOT NULL DEFAULT 0,
      division TEXT,
      git_author_time TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE problems (
      unique_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      source_description TEXT,
      is_starred INTEGER DEFAULT 0,
      difficulty TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      solution_json TEXT NOT NULL,
      in_module INTEGER DEFAULT 0,
      module_id TEXT,
      problem_data_json TEXT NOT NULL
    );

    CREATE TABLE module_problem_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      list_id TEXT NOT NULL,
      problems_json TEXT NOT NULL,
      UNIQUE(module_id, list_id)
    );

    CREATE TABLE module_frontmatter (
      file_path TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      frontmatter_json TEXT NOT NULL,
      division TEXT NOT NULL,
      UNIQUE(module_id)
    );

    CREATE TABLE solution_frontmatter (
      file_path TEXT PRIMARY KEY,
      solution_id TEXT NOT NULL,
      frontmatter_json TEXT NOT NULL
    );

    CREATE TABLE problem_slugs (
      slug TEXT PRIMARY KEY,
      unique_id TEXT NOT NULL,
      UNIQUE(unique_id)
    );

    CREATE TABLE usaco_ids (
      id TEXT PRIMARY KEY
    );
  `);

  // Create indices
  db.exec(`
    CREATE INDEX idx_mdx_content_type ON mdx_content(type);
    CREATE INDEX idx_mdx_content_division ON mdx_content(division);
    CREATE INDEX idx_problems_module_id ON problems(module_id);
    CREATE INDEX idx_problems_source ON problems(source);
    CREATE INDEX idx_module_problem_lists_module_id ON module_problem_lists(module_id);
    CREATE INDEX idx_module_frontmatter_division ON module_frontmatter(division);
    CREATE INDEX idx_solution_frontmatter_solution_id ON solution_frontmatter(solution_id);
  `);

  db.exec(`INSERT INTO mdx_content (id, type, file_path, frontmatter_json, body, toc_json, mdast_json, cpp_oc, java_oc, py_oc, division, git_author_time) VALUES ('1', 'module', '1.mdx', '{"id": "1", "title": "1"}', '1', '1', '1', 0, 0, 0, null, null)`);
  const result = db.prepare(`SELECT * FROM mdx_content`).all() as any[];
  console.log(result);
}

createSchema(await getWritableDatabase());

/*
async function indexMdxFiles(
    db: Database.Database,
    files: string[],
    type: 'module' | 'solution',
    baseDir: string
  ): Promise<void> {
    const { parseMdxFile } = await import('../src/lib/parseMdxFile');
    const insertStmt = db.prepare(`
      INSERT INTO mdx_content (
        id, type, file_path, frontmatter_json, body, toc_json,
        mdast_json, cpp_oc, java_oc, py_oc, division, git_author_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  
    // Batch git commands for performance
    const gitTimestamps = await getBatchGitTimestamps(files.map(f => path.join(baseDir, f)));
  
    const transaction = db.transaction((items: Array<{file: string, content: MdxContent}>) => {
      for (const { file, content } of items) {
        const relativePath = path.relative(baseDir, content.fileAbsolutePath);
        const gitTime = gitTimestamps.get(content.fileAbsolutePath) || null;
  
        insertStmt.run(
          content.frontmatter.id,
          type,
          relativePath,
          JSON.stringify(content.frontmatter),
          content.body,
          JSON.stringify(content.toc),
          content.mdast ? JSON.stringify(content.mdast) : null,
          content.cppOc,
          content.javaOc,
          content.pyOc,
          content.fields?.division || null,
          gitTime,
        );
      }
    });
  
    // Process files in batches with controlled concurrency
    const BATCH_SIZE = 10;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const items = await Promise.all(
        batch.map(async (file) => {
          const filePath = path.join(baseDir, file);
          const content = await parseMdxFile(filePath);
          return { file, content };
        })
      );
      transaction(items);
    }
  }
  
  async function getBatchGitTimestamps(
    filePaths: string[]
  ): Promise<Map<string, string>> {
    const { execSync } = await import('child_process');
    const timestamps = new Map<string, string>();
  
    try {
      // Single git command for all files
      const result = execSync(
        `git log --format="%ct|%H" --name-only -- ${filePaths.map(f => `"${f}"`).join(' ')}`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
  
      // Parse output
      const lines = result.split('\n');
      let currentTimestamp: string | null = null;
      
      for (const line of lines) {
        if (line.includes('|')) {
          const [timestamp] = line.split('|');
          currentTimestamp = new Date(parseInt(timestamp) * 1000).toISOString();
        } else if (line.trim() && currentTimestamp) {
          timestamps.set(path.resolve(line.trim()), currentTimestamp);
        }
      }
    } catch (error) {
      console.warn('Failed to get git timestamps:', error);
    }
  
    return timestamps;
  }
    */