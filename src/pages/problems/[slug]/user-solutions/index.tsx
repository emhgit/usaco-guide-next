import * as React from "react";
import ProblemSolutions from "../../../../components/ProblemSolutions";
import SubmitProblemSolutionModal from "../../../../components/SubmitProblemSolutionModal";
import { ShortProblemInfo } from "../../../../models/problem";
import { removeDuplicates } from "../../../../utils/utils";
import { GetStaticProps, GetStaticPaths } from "next";
import { ProblemInfo } from "../../../../types/content";
import { useRouter } from "next/router";

interface UserSolutionsProps {
  problem: ShortProblemInfo;
  allProblemInfo: ProblemInfo[];
}

export default function UserSolutionsTemplate({
  problem,
  allProblemInfo,
}: UserSolutionsProps) {
  const router = useRouter();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  const modulesThatHaveProblem: { id: string; title: string }[] =
    removeDuplicates(
      allProblemInfo
        .filter((x) => !!x.module)
        .map((x) => ({ id: x.moduleId, title: x.module?.frontmatter?.title }))
    );

  React.useEffect(() => {
    if (!problem) router.push("/");
  }, []);

  if (!problem) return null;

  const handleShowSubmitSolutionModal = () => {
    setIsSubmitModalOpen(true);
  };
  return (
    <>
      <ProblemSolutions
        modulesThatHaveProblem={modulesThatHaveProblem}
        showSubmitSolutionModal={handleShowSubmitSolutionModal}
        problem={problem}
      />
      <SubmitProblemSolutionModal
        problem={problem}
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const { loadAllProblemSlugs, loadAllUSACOIds } = await import(
      "../../../../lib/loadContent"
    );
    const div_to_probs = await import(
      "../../../../components/markdown/ProblemsList/DivisionList/div_to_probs.json"
    );
    const problemSlugs = await loadAllProblemSlugs();
    const usacoIds = await loadAllUSACOIds();
    const paths = Array.from(
      problemSlugs.values().map((slug) => ({
        params: { slug: String(slug) },
      }))
    );
    const usacoIdsToProblemsMap = new Map<string, [string, string, string]>();
    const divisions = ["Bronze", "Silver", "Gold", "Platinum"];
    divisions.forEach((division) => {
      div_to_probs[division].forEach((problem: [string, string, string]) => {
        const uniqueId = "usaco-" + problem[0];
        if (!usacoIds.has(uniqueId)) {
          paths.push({
            params: {
              slug: uniqueId,
            },
          });
          usacoIdsToProblemsMap.set(uniqueId, problem);
        }
      });
    });
    const { USACO_IDS_TO_PROBLEMS_MAP_FILE } = await import(
      "../../../../lib/constants"
    );
    const { writeFile } = await import("fs/promises");
    const { mkdir } = await import("fs/promises");
    const path = await import("path");
    await mkdir(path.dirname(USACO_IDS_TO_PROBLEMS_MAP_FILE), {
      recursive: true,
    });
    await writeFile(
      USACO_IDS_TO_PROBLEMS_MAP_FILE,
      JSON.stringify(Array.from(usacoIdsToProblemsMap.entries()))
    );
    return { paths, fallback: true };
  } catch (error) {
    console.error("Error loading problem slugs:", error);
    return { paths: [], fallback: true };
  }
};

export const getStaticProps: GetStaticProps = async (context) => {
  try {
    const { USACO_IDS_TO_PROBLEMS_MAP_FILE } = await import(
      "../../../../lib/constants"
    );
    const { loadAllProblems } = await import("../../../../lib/loadContent");
    const readFile = await import("fs/promises");
    // Explicitly convert slug to string
    const { slug: rawSlug } = context.params || {};
    const slug = String(rawSlug); // Ensure slug is always a string
    const usacoIdsToProblemsMap = new Map(
      JSON.parse(
        await readFile.readFile(USACO_IDS_TO_PROBLEMS_MAP_FILE, "utf-8")
      )
    );
    const uniqueId = slug;
    let problem: ShortProblemInfo | null = null;
    if (usacoIdsToProblemsMap.has(slug)) {
      const problemInfo = usacoIdsToProblemsMap.get(slug)!;
      problem = {
        uniqueId,
        name: problemInfo[2],
        url: "",
      };
    }
    const loadedProblems = await loadAllProblems();
    problem =
      problem ||
      loadedProblems.problems.find((problem) => problem.uniqueId === uniqueId);
    const allProblemInfo = loadedProblems.problems.filter(
      (problem) => problem.uniqueId === uniqueId
    );
    if (!allProblemInfo || allProblemInfo.length === 0) {
      console.error(`Problem not found for slug: ${uniqueId}`);
      return {
        notFound: true,
      };
    }
    return {
      props: {
        problem,
        allProblemInfo,
      },
    };
  } catch (error) {
    console.error("Error loading problem slugs:", error);
    return {
      notFound: true,
    };
  }
};
