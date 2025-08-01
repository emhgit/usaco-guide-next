export interface Heading {

    depth: number;

    value: string;

    slug: string;

}



export interface TableOfContents {

    cpp?: Heading[];

    java?: Heading[];

    py?: Heading[];

}



export interface XdmFrontmatter {

    id: string;

    title: string;

    author?: string;

    contributors?: string;

    description?: string;

    prerequisites?: string[];

    redirects?: string[];

    frequency?: number;

    isIncomplete?: boolean;

}



export interface XdmContent {

    body: string;

    fileAbsolutePath: string;

    frontmatter: XdmFrontmatter;

    toc?: TableOfContents;

    cppOc?: number;

    javaOc?: number;

    pyOc?: number;

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

    isStarred: boolean;

    difficulty?: string;

    tags: string[];

    solution?: ProblemSolutionInfo;

}



export interface ProblemInfo extends ModuleProblemInfo {

    inModule: boolean;

    module?: XdmContent; // Reference to parent module

}



export interface ModuleProblemList {

    listId: string;

    problems: ModuleProblemInfo[];

}



export interface ModuleProblemLists {

    moduleId: string;

    problemLists: ModuleProblemList[];

}       