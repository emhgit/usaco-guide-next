import { GetStaticProps } from "next";
import Markdown from "../components/markdown/Markdown";
import { MdxContent } from "../types/content";

export default function Home({ module }: { module: MdxContent }) {
  return <Markdown body={module.body} />;
}

export const getStaticProps: GetStaticProps = async (context) => {
  try {
    const { parseMdxFile } = await import("../lib/parseMdxFile");
    const module = await parseMdxFile("docs/MIGRATION.md");
    return {
      props: {
        module,
      },
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return { notFound: true };
  }
};
