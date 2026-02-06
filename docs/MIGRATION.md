# USACO Guide Gatsby to Next.js Migration

### Author: Elliott Harper

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Motivation](#motivation)
- [Architecture Changes](#architecture-changes)
- [Data Flow](#data-flow)
- [Pages Creation](#pages-creation)
- [Performance & Quality Benchmarking Plan](#performance--quality-benchmarking-plan)

## Overview

The goal of this migration is a framework change to improve:

- Performance
  - Faster builds, faster development startup, faster content compilation
  - Better user performance (Core Web Vitals)
- Maintainability
  - Modern React framework with up-to-date MDX plugins
  - Simplified build pipeline
  - Better developer experience
- Scalability
  - Better support for large-scale `.mdx` content
  - More flexible routing and data fetching options

## Current Status

This migration is **in progress**. Many core features have already been implemented.

### Completed/Mostly Completed

- [x] Create syllabus pages
- [x] Create solutions pages
- [x] Create user solutions pages
- [x] Copy over `api/` directory and convert Gatsby syntax to Next.js syntax
- [x] Implement Groups (Set each component to the proper file under `pages/`, i have already converted the components)
- [x] Implement editor (investigate why auth isnt working; might be bc dev mode)
- [ ] Configure redirects
- [ ] Update algolia config for Next.js (indexing script in `/scripts`)
- [ ] copy over all other components/scripts/utils
- [ ] Update storybook config for next.js
- [ ] copy over stories
- [ ] update deployment scripts
- [ ] update docs

## Motivation

### Why Next.js?

The current website is functional with Gatsby, but several issues have arisen over time:

- Custom Gatsby node plumbing becomes increasingly complex
- Plugin ecosystem is outdated
- Upgrading dependencies often breaks build pipeline
- Local development can become slow and inconsistent

Next.js offers a modern React framework that is up to date with MDX plugins. This supports better long-term maintainability and fewer framework-specific workarounds.

## Architecture Changes

In Gatsby, the `gatsby-node.ts` file orchestrated:

- The GraphQL node creation for `.mdx` and `.json` files from the `content/` and `solutions/` directories
- The dynamic page creation for the syllabus, modules, and solutions pages
- Schema customization using type definitions
- Development and build-time webpack configuration

These were core components of the system design. Hence, the Next.js system design has to replicate this functionality while adapting to the changes in the framework.

The static page generation phase of the Next.js build process utilizes parallel processing to build pages simultaneously. To account for this, content will be pre-loaded using filesystem reads in a similar manner. But, an **SQLite database** will be used as a shared caching layer. This allows for read-only queries across all workers during build time, eliminating redundant I/O and parsing. A prebuild script will be used to parse all MDX files and store them in the database. The types defined in [content.ts](../src/types/content.ts) will be used to ensure consistency. Files such as the [solution template](../src/pages/problems/[slug]/solution/index.tsx) and [module template](../src/pages/[division]/[slug]/index.tsx) will query the database and dynamically load content.

## Database Schema Design

### Table: `mdx_content`

Stores parsed MDX files (both modules and solutions).

```sql
CREATE TABLE mdx_content (
  id TEXT PRIMARY KEY,                    -- frontmatter.id
  type TEXT NOT NULL,                     -- 'module' | 'solution'
  file_path TEXT NOT NULL,                -- relative file path
  frontmatter_json TEXT NOT NULL,         -- JSON string of MdxFrontmatter
  body TEXT NOT NULL,                     -- compiled MDX body (string)
  toc_json TEXT NOT NULL,                 -- JSON string of TableOfContents
  mdast_json TEXT,                        -- JSON string of mdast
  cpp_oc INTEGER NOT NULL DEFAULT 0,
  java_oc INTEGER NOT NULL DEFAULT 0,
  py_oc INTEGER NOT NULL DEFAULT 0,
  division TEXT,                          -- SectionID or NULL
  git_author_time TEXT,                   -- ISO timestamp or NULL
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_mdx_content_type ON mdx_content(type);
CREATE INDEX idx_mdx_content_division ON mdx_content(division);
```

### Table: `problems`

Stores problem information.

```sql
CREATE TABLE problems (
  unique_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  source_description TEXT,
  is_starred INTEGER DEFAULT 0,           -- SQLite boolean as INTEGER
  difficulty TEXT NOT NULL,               -- ProblemDifficulty enum
  tags_json TEXT NOT NULL,                -- JSON array of strings
  solution_json TEXT NOT NULL,            -- JSON string of ProblemSolutionInfo
  in_module INTEGER DEFAULT 0,
  module_id TEXT,                         -- Foreign key to mdx_content.id
  problem_data_json TEXT NOT NULL         -- Full ProblemInfo as JSON for quick retrieval
);

CREATE INDEX idx_problems_module_id ON problems(module_id);
CREATE INDEX idx_problems_source ON problems(source);
```

### Table: `module_problem_lists`

Stores module problem list relationships.

```sql
CREATE TABLE module_problem_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id TEXT NOT NULL,               -- Foreign key to mdx_content.id
  list_id TEXT NOT NULL,
  problems_json TEXT NOT NULL,           -- JSON array of ProblemInfo
  UNIQUE(module_id, list_id)
);

CREATE INDEX idx_module_problem_lists_module_id ON module_problem_lists(module_id);
```

### Table: `module_frontmatter`

Stores lightweight module frontmatter for quick lookups.

```sql
CREATE TABLE module_frontmatter (
  file_path TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,               -- Foreign key to mdx_content.id
  frontmatter_json TEXT NOT NULL,        -- JSON string of MdxFrontmatter
  division TEXT NOT NULL,                -- SectionID
  UNIQUE(module_id)
);

CREATE INDEX idx_module_frontmatter_division ON module_frontmatter(division);
```

### Table: `solution_frontmatter`

Stores lightweight solution frontmatter.

```sql
CREATE TABLE solution_frontmatter (
  file_path TEXT PRIMARY KEY,
  solution_id TEXT NOT NULL,             -- Foreign key to mdx_content.id
  frontmatter_json TEXT NOT NULL         -- JSON string of MdxFrontmatter
);

CREATE INDEX idx_solution_frontmatter_solution_id ON solution_frontmatter(solution_id);
```

### Table: `problem_slugs`

Maps problem slugs to unique IDs.

```sql
CREATE TABLE problem_slugs (
  slug TEXT PRIMARY KEY,
  unique_id TEXT NOT NULL,                -- Foreign key to problems.unique_id
  UNIQUE(unique_id)
);
```

### Table: `usaco_ids`

Stores USACO problem IDs.

```sql
CREATE TABLE usaco_ids (
  id TEXT PRIMARY KEY
);
```

### Data Flow

| Content Type       | Gatsby Source         | Next.js Source        |
| ------------------ | --------------------- | --------------------- |
| Syllabus / modules | `/content/**/*.mdx`   | `/content/**/*.mdx`   |
| Problems metadata  | `/problems/**/*.json` | `/problems/**/*.json` |
| Solutions          | `/solutions/**/*.mdx` | `/solutions/**/*.mdx` |
| User solutions     | internal pipeline     | internal pipeline     |

### MDX Processing

In the [loadContent.ts](../src/lib/loadContent.ts) file, utility functions load MDX content from the [content/](../content/) and [solutions/](../solutions/) directories. These MDX processing utility functions rely on the [parseMdxFile.ts](../src/lib/parseMdxFile.ts) file. The [parseMdxFile.ts](../src/lib/parseMdxFile.ts) file replicates the functionality of the `create-xdm-node.ts` file, with some changes:

1.  Updated `remarkAutolinkHeadings` to `rehypeAutolinkHeadings`
2.  Updated `remarkSlug` to `rehypeSlug`
3.  Updated `remarkExternalLinks` to `rehypeExternalLinks`
4.  Modified all files in [mdx-plugins/](../src/lib/parseMdxFile.ts) to use ESM syntax rather than CommonJS syntax because `require()` and `module.exports` caused errors

Utility functions to load and parse the problem JSON data from the [content/](../content/) directory were also created.

The [tests/](../src/lib/__tests__/) directory contains the scripts to test the loading functions in the [loadContent.ts](../src/lib/loadContent.ts) file.

### Data Validation

The `validateProblemConsistency` function in [validateData.ts](../src/lib/validateData.ts) essentially replicates the logic of `gatsby-node.ts:264-325`, ensuring that problems aren’t sharing ids, urls, etc.

The `validateSolutionRelationships` function essentially replicates the logic of `gatsby-node.ts:402:484`, ensuring that problems that have claim to have internal solutions actual do.

## Pages Creation

Pages that have brackets in their file path (e.g. `[value]`) will use `getStaticPaths` to dynamically load. Pages that require data from the [lib/](../src/lib) (`solutions/`, `user-solutions`, etc.) will use `getStaticProps`. `getStaticPaths` and `getStaticProps` run during build time on the server, which will reduce load on the client.

`getStaticPaths` essentially replaces `createPage`, and `getStaticProps` essentially replaces the GraphQL queries.

The [SEO](../src/components/seo.tsx) component has been adapted to use `next/router` and `next/head`. Otherwise, the functionality stays the same.

### Page Loading

The syllabus pages for bronze, silver, gold, platinum, and advanced have been implemented. The [pages/[division]/index.tsx](../src/pages/[division]/index.tsx) file uses `getStaticPaths` and `getStaticProps` to load the data, and then pass it to the [SyllabusPage](../src/components/syllabus/SyllabusPage.tsx) component. This essentially replicates the `SyllabusTemplate` component.

**Note**

All static files have been moved to the [public/](../public/) directory because Next.js can only serve static files from there. I used the `migrate-imports.cjs` script to update change all relative imports to absolute imports in the [content/](../content/) and [solutions/](../solutions/) directories.

## Performance & Quality Benchmarking Plan

### Goals

Gatsby and Next.js will be compared across:

1. Build pipeline performance

2. Developer experience

3. User performance

4. Maintainability metrics

Benchmarks will be tracked over time and included in PRs when relevant.

### Performance / Quality Tasks

- [ ] Add MDX compilation timing instrumentation

- [ ] Add dev startup timing script

- [ ] Add build timing script (cold + warm cache)

- [ ] Add dependency freshness reporting

- [ ] Add bundle analyzer baseline

- [ ] Add Web Vitals reporting (lab + field)

- [ ] Document benchmark results in docs/benchmarks.md

| Metric            | Value |
| ----------------- | ----- |
| MDX compile time  | TBD   |
| Dev startup time  | TBD   |
| Build time (cold) | TBD   |
| Build time (warm) | TBD   |
| LCP               | TBD   |
| INP               | TBD   |
| CLS               | TBD   |

| Metric            | Value |
| ----------------- | ----- |
| MDX compile time  | TBD   |
| Dev startup time  | TBD   |
| Build time (cold) | TBD   |
| Build time (warm) | TBD   |
| LCP               | TBD   |
| INP               | TBD   |
| CLS               | TBD   |
