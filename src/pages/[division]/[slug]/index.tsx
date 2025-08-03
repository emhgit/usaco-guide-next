import * as React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetStaticProps, GetStaticPaths } from 'next';
import { SECTION_LABELS } from '../../../../content/ordering';
import Layout from '../../../components/layout';
import Markdown from '../../../components/markdown/Markdown';
import MarkdownLayout from '../../../components/MarkdownLayout/MarkdownLayout';
import SEO from '../../../components/seo';
import { ConfettiProvider } from '../../../context/ConfettiContext';
import { MarkdownProblemListsProvider } from '../../../context/MarkdownProblemListsContext';
import { useIsUserDataLoaded } from '../../../context/UserDataContext/UserDataContext';
import { loadAllModules, loadAllProblems, loadContent } from '../../../lib/loadContent';
import { graphqlToModuleInfo } from '../../../utils/utils';

interface ModulePageProps {
  moduleData: any; // Replace with your actual module data type
  moduleProblemLists: any[]; // Replace with your actual problem lists type
  modules: any[]; // Add modules array to props
}

export default function ModuleTemplate({ moduleData, moduleProblemLists, modules }: ModulePageProps): JSX.Element {
  const router = useRouter();
  const { division, slug } = router.query;
  const moduleInfo = React.useMemo(() => graphqlToModuleInfo(moduleData), [moduleData]);
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
      
      <ConfettiProvider>
        <MarkdownProblemListsProvider value={moduleProblemLists || []}>
          <MarkdownLayout markdownData={moduleInfo} modules={modules}>
            <div className="py-4">
              <Markdown body={moduleData.body} />
            </div>
          </MarkdownLayout>
        </MarkdownProblemListsProvider>
      </ConfettiProvider>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Load all modules to generate paths
  const modules = await loadAllModules();
  
  const paths = modules
    .filter(({ frontmatter }) => frontmatter.division)
    .map(({ frontmatter }) => ({
      params: {
        division: frontmatter.division,
        slug: frontmatter.id,
      },
    }));

  return {
    paths,
    fallback: false, // or 'blocking' if you want to enable fallback behavior
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { division, slug } = context.params as { division: string; slug: string };
  
  // Load the specific module data
  const modules = await loadAllModules();
  const moduleData = modules.find(
    ({ frontmatter }) => 
      frontmatter.division === division && 
      frontmatter.id === slug
  );

  if (!moduleData) {
    return {
      notFound: true,
    };
  }

  // Load problem lists - you'll need to implement this in loadContent
  const moduleProblemLists = await loadProblemListsForModule(slug);

  return {
    props: {
      moduleData,
      moduleProblemLists: moduleProblemLists?.problemLists || [],
      modules, // Add the modules array to props
    },
  };
};

// Helper function to load problem lists (implement this based on your data source)
async function loadProblemListsForModule(moduleId: string) {
  // Implement based on how you fetch problem lists in your system
  // This should return data in the same format as your Gatsby query
  const { moduleProblemLists } = await loadAllProblems();
  const problemLists = moduleProblemLists.find(
    (moduleProblemList) => moduleProblemList.moduleId === moduleId
  );
  return { problemLists };
}