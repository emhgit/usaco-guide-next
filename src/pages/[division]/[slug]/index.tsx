import * as React from "react";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { GetStaticProps, GetStaticPaths } from "next";
import Layout from "../../../components/layout";
import Markdown from "../../../components/markdown/Markdown";
import SEO from "../../../components/seo";
import { useIsUserDataLoaded } from "../../../context/UserDataContext/UserDataContext";
import { graphqlToModuleInfo } from "../../../utils/utils";
import { MarkdownProblemListsProvider } from "../../../context/MarkdownProblemListsContext";
import { MdxContent, ModuleProblemLists } from "../../../types/content";
import { ProblemInfo } from "../../../models/problem";

interface ModulePageProps {
  moduleData: MdxContent; // Replace with your actual module data type
  moduleProblemLists?: ModuleProblemLists;
}

export default function ModuleTemplate({
  moduleData,
  moduleProblemLists,
}: ModulePageProps): JSX.Element {
  const moduleInfo = React.useMemo(
    () => graphqlToModuleInfo(moduleData),
    [moduleData]
  );
  const isLoaded = useIsUserDataLoaded();

  useEffect(() => {
    // Handle hash-based scrolling
    const { hash } = window.location;
    if (!hash) return;
    if (!isLoaded) return;

    window.requestAnimationFrame(() => {
      try {
        const anchor = document.getElementById(hash.substring(1));
        if (!anchor) throw new Error(`The anchor "${hash}" doesn't exist`);
        const offset = anchor.getBoundingClientRect().top + window.scrollY;
        window.scroll({ top: offset, left: 0 });
      } catch (e) {
        console.error(e);
      }
    });
  }, [isLoaded]);

  if (!moduleData) {
    return <div>Loading...</div>;
  }

  return (
    <Layout setLastViewedModule={moduleInfo.id}>
      <SEO title={`${moduleInfo.title}`} description={moduleInfo.description} />
      <div className="py-4">
        <MarkdownProblemListsProvider value={moduleProblemLists?.problemLists}>
          <Markdown body={moduleData.body} />
        </MarkdownProblemListsProvider>
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Load all modules to generate paths
  const { loadAllModuleFilePaths } = await import("../../../lib/loadContent");
  const data = await loadAllModuleFilePaths();
  const paths = data
    .map(({ division, slug }) => {
      return {
        params: {
          division,
          slug, // Handle nested paths in slug
        },
      };
    })
    .filter(Boolean); // Remove any null entries

  return {
    paths,
    fallback: false, // or 'blocking' if you want to enable fallback behavior
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  try {
    const { loadModule, loadAllModuleFilePaths, loadAllProblems } =
      await import("../../../lib/loadContent");
    const { division, slug } = context.params as {
      division: string;
      slug: string;
    };

    if (!division || !slug) {
      console.error("Missing division or slug in params");
      return { notFound: true };
    }

    let data;
    try {
      data = await loadAllModuleFilePaths();
      if (
        !data ||
        !Array.isArray(data) ||
        data === null ||
        data === undefined
      ) {
        console.error(
          "Failed to load module file paths or invalid data format"
        );
        return { notFound: true };
      }
      console.log(
        `Found ${data.length} modules, looking for ${division}/${slug}`
      );
    } catch (error) {
      console.error("Error loading module file paths:", error);
      return { notFound: true };
    }

    const moduleInfo = data.find(
      (item) => item.division === division && item.slug === slug
    );
    console.log(
      moduleInfo
        ? `found: ${moduleInfo.filePath} for ${division}/${slug}`
        : "No module info"
    );

    if (!moduleInfo?.filePath) {
      console.error(
        `Module not found for division: ${division}, slug: ${slug}`
      );
      return { notFound: true };
    }

    // Load the specific module data
    try {
      const moduleData = await loadModule(moduleInfo.filePath);
      if (!moduleData) {
        console.error(
          `Failed to load module data for path: ${moduleInfo.filePath}`
        );
        return { notFound: true };
      }
      // const { moduleProblemLists } = await loadAllProblems();
      const loadProblemListsForModule = async (moduleId: string) => {
        const { moduleProblemLists } = await loadAllProblems();
        const problemLists = moduleProblemLists.find(
          (moduleProblemList) => moduleProblemList.moduleId === moduleId
        );
        return problemLists;
      };
      const moduleProblemLists = await loadProblemListsForModule(slug);
      return {
        props: {
          moduleData,
          moduleProblemLists: moduleProblemLists ?? null,
        },
      };
    } catch (error) {
      console.error(`Error loading module ${moduleInfo.filePath}:`, error);
      return { notFound: true };
    }
  } catch (error) {
    console.error("Unexpected error in getStaticProps:", error);
    return { notFound: true };
  }
};
