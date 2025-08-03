import { SectionID } from "../../content/ordering";
import { ModuleFrequency } from "../models/module";

export interface Heading {
  depth: number;

  value: string;

  slug: string;
}

export interface TableOfContents {
  cpp: Heading[];

  java: Heading[];

  py: Heading[];
}

export interface MdxFrontmatter {
  id: string;
  title: string;
  author?: string;
  contributors?: string;
  description?: string;
  prerequisites?: string[];
  redirects?: string[];
  frequency?: ModuleFrequency;
  isIncomplete?: boolean;
  lastUpdated?: string;
  division?: SectionID;

  // Problem-specific fields
  source?: string;
  difficulty?: string;
  tags?: string[];
  isStarred?: boolean;
  solution?: string | ProblemSolutionInfo;
}

export interface MdxContent {
  body: string;

  fileAbsolutePath: string;

  slug?: string;

  frontmatter: MdxFrontmatter;

  toc: TableOfContents;

  cppOc: number;

  javaOc: number;

  pyOc: number;

  mdast?: string;

  fields?: Fields;
}

export interface Fields {
  gitAuthorTime?: string;

  division?: SectionID;
}

export interface ProblemSolutionInfo {
  kind: string;

  label?: string;

  labelTooltip?: string;

  url?: string;

  sketch?: string;

  hasHints?: boolean;
}

export interface ModuleProblemInfo {
  uniqueId: string;

  name: string;

  url: string;

  source: string;

  sourceDescription?: string;

  isStarred?: boolean;

  difficulty?: string;

  tags: string[];

  solution?: ProblemSolutionInfo;
}

export interface ProblemInfo extends ModuleProblemInfo {
  inModule?: boolean;

  module?: MdxContent; // Reference to parent module
}

export interface ModuleProblemList {
  listId: string;

  problems: ModuleProblemInfo[];
}

export interface ModuleProblemLists {
  moduleId: string;

  problemLists: ModuleProblemList[];
}
