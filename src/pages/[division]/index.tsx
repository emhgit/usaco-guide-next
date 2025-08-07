import * as React from "react";
import { GetStaticProps, GetStaticPaths } from "next";
import {
  moduleIDToSectionMap,
  SectionID,
  SECTION_LABELS,
  SECTION_SEO_DESCRIPTION,
  SECTION_SEO_TITLES,
} from "../../../content/ordering";
import DashboardProgress, {
  DashboardProgressSmall,
} from "../../components/Dashboard/DashboardProgress";
import SEO from "../../components/seo";
import ModuleLink from "../../components/syllabus/ModuleLink";
import TopNavigationBar from "../../components/TopNavigationBar/TopNavigationBar";
import { ModuleFrequency, ModuleLinkInfo } from "../../models/module";
import {
  useModulesProgressInfo,
  useProblemsProgressInfo,
} from "../../utils/getProgressInfo";
import { getModulesForDivision } from "../../utils/utils";
import { MdxContent } from "../../types/content";
import { ProblemInfo } from "../../types/content";
import Layout from "../../components/layout";

const HeroBGColor: { [key in SectionID]: string } = {
  general: "bg-blue-700 dark:bg-blue-900",
  bronze: "bg-orange-800 dark:bg-orange-900",
  silver: "bg-teal-700 dark:bg-teal-900",
  gold: "bg-yellow-700 dark:bg-yellow-900",
  plat: "bg-purple-700 dark:bg-purple-900",
  adv: "bg-green-700 dark:bg-green-900",
};

const HeroTextColor: { [key in SectionID]: string } = {
  general: "text-teal-200",
  bronze: "text-orange-100",
  silver: "text-teal-100",
  gold: "text-yellow-100",
  plat: "text-purple-100",
  adv: "text-green-100",
};

const topicsWarning = (
  <>
    The topics below are not exhaustive for this division.
    <br />
    Contest problems may contain topics not covered in the guide, or topics
    listed under different divisions!
  </>
);

const SECTION_DESCRIPTION: { [key in SectionID]: React.ReactNode } = {
  general: (
    <>
      You don't have to complete all the modules in this section before moving
      on to Bronze.
      <br />
      Feel free to mark some as "skipped" and revisit them at a later time!
    </>
  ),
  bronze: (
    <>
      {topicsWarning}
      <br />
      If you prefer videos instead of text, check out CPI's free{" "}
      <a
        href="https://joincpi.org/video-classes"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        self-study Bronze course.
      </a>
    </>
  ),
  silver: topicsWarning,
  gold: topicsWarning,
  plat: (
    <>
      {topicsWarning}
      <br />
      Some lower-frequency topics are included in "Advanced."
    </>
  ),
  adv: (
    <>
      Some of these topics have not appeared in Platinum and probably never will
      (ex. Matroid Intersection).
      <br />
      Others have appeared in Old Gold or Platinum very infrequently (ex. BCC,
      Suffix Array).
    </>
  ),
};

export interface SyllabusProps {
  division: SectionID;
  allModules: { [key: string]: MdxContent };
  problemsForThisDivision: ProblemInfo[];
}

export default function SyllabusTemplate({
  division,
  allModules,
  problemsForThisDivision,
}: SyllabusProps) {
  const section = getModulesForDivision(allModules, division);

  const moduleIDs = section.reduce((acc, curr) => {
    return [...acc, ...curr.items.map((x) => x.frontmatter.id)];
  }, [] as string[]);

  const moduleProgressInfo = useModulesProgressInfo(moduleIDs);
  const problemIDs = [
    ...new Set(problemsForThisDivision.map((p) => p.uniqueId) as string[]),
  ];
  const problemsProgressInfo = useProblemsProgressInfo(problemIDs);
  const useProgressBarForCategory = (category: (typeof section)[0]) => {
    const categoryModuleIds = category.items.map(
      (module) => module.frontmatter.id
    );
    const categoryProblemIds = problemsForThisDivision
      .filter((problem) =>
        categoryModuleIds.includes(problem.module?.frontmatter.id || "")
      )
      .map((x) => x.uniqueId);
    const problemsProgressInfo = useProblemsProgressInfo(categoryProblemIds);
    return (
      categoryProblemIds.length > 1 && (
        <DashboardProgressSmall
          {...problemsProgressInfo}
          total={categoryProblemIds.length}
        />
      )
    );
  };

  return (
    <Layout>
      <div>
        <SEO
          title={SECTION_SEO_TITLES[division]}
          description={SECTION_SEO_DESCRIPTION[division]}
        />
        <div className="min-h-screen">
          <TopNavigationBar currentSection={division} />

          <main>
            <div className={`${HeroBGColor[division]} py-12 sm:py-16`}>
              <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                <h1 className="mb-6 text-center text-5xl leading-10 font-black tracking-tight text-white sm:leading-none md:text-6xl">
                  {SECTION_LABELS[division]}
                </h1>

                <p
                  className={`${HeroTextColor[division]} mb-8 px-4 text-center sm:mb-12`}
                >
                  {SECTION_DESCRIPTION[division]}
                </p>
                <div className="mx-auto grid max-w-2xl gap-8 lg:max-w-full lg:grid-cols-2">
                  <div className="bg-white shadow-sm sm:rounded-lg dark:bg-gray-900">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="dark:text-dark-high-emphasis text-lg leading-6 font-medium text-gray-900">
                        Modules Progress
                      </h3>
                      <div className="mt-6">
                        <DashboardProgress
                          {...moduleProgressInfo}
                          total={moduleIDs.length}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow-sm sm:rounded-lg dark:bg-gray-900">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="dark:text-dark-high-emphasis text-lg leading-6 font-medium text-gray-900">
                        Problems Progress
                      </h3>
                      <div className="mt-6">
                        <DashboardProgress
                          {...problemsProgressInfo}
                          total={problemIDs.length}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="syllabus-dotted-line-container mx-auto max-w-(--breakpoint-xl) space-y-6 px-4 py-12">
              {section.map((category) => (
                <div
                  key={category.name}
                  className="group/category flex flex-col md:flex-row"
                >
                  <div className="flex-1 pr-12 md:text-right">
                    <h2 className="dark:text-dark-med-emphasis dark:group-hover/category:text-dark-high-emphasis py-3 text-2xl leading-6 font-semibold text-gray-500 transition group-hover/category:text-gray-800">
                      {category.name}
                    </h2>
                    <div className="dark:text-dark-med-emphasis dark:group-hover/category:text-dark-high-emphasis py-3 leading-6 text-gray-500 transition group-hover/category:text-gray-800">
                      {/* eslint-disable-next-line react-hooks/rules-of-hooks */}
                      {useProgressBarForCategory(category)}
                    </div>
                    <p className="dark:group-hover/category:text-dark-med-emphasis text-gray-400 transition group-hover/category:text-gray-600 md:ml-auto md:max-w-sm dark:text-gray-500">
                      {category.description}
                    </p>
                  </div>
                  <div className="flex-1 pl-12">
                    {category.items.map((item) => (
                      <ModuleLink
                        key={item.frontmatter.id}
                        link={
                          new ModuleLinkInfo(
                            item.frontmatter.id,
                            moduleIDToSectionMap[item.frontmatter.id],
                            item.frontmatter.title,
                            item.frontmatter.description,
                            item.frontmatter.frequency as ModuleFrequency,
                            item.frontmatter.isIncomplete,
                            item.cppOc,
                            item.javaOc,
                            item.pyOc,
                            [],
                            item.fields?.gitAuthorTime
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { loadAllModuleFrontmatter } = await import("../../lib/loadContent");
  const data = await loadAllModuleFrontmatter();
  const paths = data.map(({ division }) => ({
    params: {
      division,
    },
  }));
  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  try {
    const { loadAllModules, loadAllProblems } = await import(
      "../../lib/loadContent"
    );
    const { division } = context.params as { division: SectionID };
    const loadedModules = await loadAllModules();
    if (!loadedModules || loadedModules.size === 0) {
      console.error("No modules loaded or failed to load modules");
      return { notFound: true };
    }
    const modulesForThisDivision = loadedModules
      .values()
      .filter((module) => module.fields.division === division);

    const allModules = modulesForThisDivision.reduce((acc, curr) => {
      acc[curr.frontmatter.id] = curr;
      return acc;
    }, {} as { [key: string]: MdxContent });
    if (!allModules) {
      console.error("Failed to load modules for division:", division);
      return { notFound: true };
    }

    const loadedProblems = await loadAllProblems();
    if (!loadedProblems) {
      console.error("Failed to load modules or problems");
      return { notFound: true };
    }
    const problemsForThisDivision = loadedProblems.problems.filter(
      (problem) => problem.module?.fields?.division === division
    );
    return {
      props: {
        division,
        allModules,
        problemsForThisDivision,
      },
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return { notFound: true };
  }
};
