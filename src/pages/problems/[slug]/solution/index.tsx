import * as React from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import {
  MdxContent,
  MdxFrontmatter,
  ProblemInfo,
} from "../../../../types/content";
import { removeDuplicates } from "../../../../utils/utils";
import { SolutionInfo } from "../../../../models/solution";
import Layout from "../../../../components/layout";
import SEO from "../../../../components/seo";
import { ConfettiProvider } from "../../../../context/ConfettiContext";
import { ProblemSolutionContext } from "../../../../context/ProblemSolutionContext";
import MarkdownLayout from "../../../../components/MarkdownLayout/MarkdownLayout";
import Markdown from "../../../../components/markdown/Markdown";
import { CachedImagesProvider } from "../../../../context/CachedImagesContext";
import { getProblemURL } from "../../../../models/problem";

interface SolutionTemplateProps {
  solutionForSlug: MdxContent;
  allProblemInfo: ProblemInfo[];
  problemInfo: ProblemInfo;
  loadedModuleFrontmatter: {
    filePath: string;
    frontmatter: MdxFrontmatter;
    division: string;
  }[];
  cachedImagesJson?: string;
}

export default function SolutionTemplate({
  solutionForSlug,
  allProblemInfo,
  problemInfo,
  loadedModuleFrontmatter,
  cachedImagesJson,
}: SolutionTemplateProps) {
  const modulesThatHaveProblem: { id: string; title: string }[] =
    removeDuplicates(
      allProblemInfo
        .filter((problem) => !!problem.module)
        .map((x) => ({ id: x.moduleId, title: x.module?.frontmatter.title }))
    );

  const markdownData = React.useMemo(() => {
    return new SolutionInfo(
      solutionForSlug.frontmatter.id,
      solutionForSlug.frontmatter.source,
      `${solutionForSlug.frontmatter.source} - ${solutionForSlug.frontmatter.title}`,
      solutionForSlug.frontmatter.author,
      solutionForSlug.toc,
      solutionForSlug.fileAbsolutePath
    );
  }, [solutionForSlug]);

  const problem = {
    url: problemInfo.url,
    uniqueId: problemInfo.uniqueId,
  };

  return (
    <Layout>
      <SEO
        title={`Solution - ${solutionForSlug.frontmatter.title} (${solutionForSlug.frontmatter.source})`}
      />

      <ConfettiProvider>
        <ProblemSolutionContext.Provider
          value={{
            modulesThatHaveProblem,
            problem,
          }}
        >
          <CachedImagesProvider value={cachedImagesJson}>
            <MarkdownLayout
              markdownData={markdownData}
              frontmatter={loadedModuleFrontmatter.map((x) => x.frontmatter)}
            >
              <div className="py-4">
                <Markdown body={solutionForSlug.body} />
              </div>
            </MarkdownLayout>
          </CachedImagesProvider>
        </ProblemSolutionContext.Provider>
      </ConfettiProvider>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const { loadAllProblems, loadAllSolutionFrontmatter } = await import(
      "../../../../lib/loadContent"
    );
    const { SLUG_ID_MAPPING_FILE } = await import("../../../../lib/constants");
    const { writeFile } = await import("fs/promises");
    const { mkdir } = await import("fs/promises");
    const path = await import("path");

    const { problems } = await loadAllProblems();
    const solutions = await loadAllSolutionFrontmatter();
    const slugIdMap: { [slug: string]: string } = {};
    const paths = solutions.map(({ frontmatter }) => {
      const problem = problems.find(
        (problem) => problem.uniqueId === frontmatter.id
      );
      if (!problem) {
        console.error(`Problem not found for slug: ${frontmatter.id}`);
        return;
      }
      const slug = getProblemURL(problem);
      slugIdMap[slug] = problem.uniqueId;
      return {
        params: {
          slug,
        },
      };
    });

    await mkdir(path.dirname(SLUG_ID_MAPPING_FILE), { recursive: true });
    await writeFile(SLUG_ID_MAPPING_FILE, JSON.stringify(slugIdMap));

    return {
      paths,
      fallback: true,
    };
  } catch (error) {
    console.error("Error loading problem file paths:", error);
    return {
      paths: [],
      fallback: true,
    };
  }
};

export const getStaticProps: GetStaticProps = async (context) => {
  try {
    const {
      loadAllProblems,
      loadAllSolutions,
      loadAllModuleFrontmatter,
      getCachedImages,
    } = await import("../../../../lib/loadContent");
    const { readFile } = await import("fs/promises");
    const { SLUG_ID_MAPPING_FILE } = await import("../../../../lib/constants");
    const mappingFileContent = await readFile(SLUG_ID_MAPPING_FILE, "utf-8");
    const slugIdMap = JSON.parse(mappingFileContent);
    const { slug } = context.params as {
      slug: string;
    };
    const uniqueId = slugIdMap[slug];
    const loadedSolutions = await loadAllSolutions();
    if (!loadedSolutions) {
      console.error("Failed to load solutions");
      return {
        notFound: true,
      };
    }
    const solutionForSlug = loadedSolutions.get(uniqueId);
    if (!solutionForSlug) {
      console.error(`Solution not found for slug: ${uniqueId}`);
      return {
        notFound: true,
      };
    }
    const problems = await loadAllProblems();
    const allProblemInfo = problems.problems.filter(
      (problem) => problem.uniqueId === uniqueId
    );
    if (!allProblemInfo || allProblemInfo.length === 0) {
      console.error(`Problems not found for slug: ${uniqueId}`);
      return {
        notFound: true,
      };
    }
    const problemInfo = problems.problems.find(
      (problem) => problem.uniqueId === uniqueId
    );
    if (!problemInfo) {
      console.error(`Problem not found for slug: ${uniqueId}`);
      return {
        notFound: true,
      };
    }
    const loadedModuleFrontmatter = await loadAllModuleFrontmatter();
    if (!loadedModuleFrontmatter) {
      console.error("Failed to load modules");
      return {
        notFound: true,
      };
    }
    const cachedImages = await getCachedImages();
    const cachedImagesJson = JSON.stringify(Array.from(cachedImages.entries()));
    return {
      props: {
        solutionForSlug,
        allProblemInfo,
        problemInfo,
        loadedModuleFrontmatter,
        cachedImagesJson,
      },
    };
  } catch (error) {
    console.error("Error loading problem file paths:", error);
    return {
      notFound: true,
    };
  }
};
