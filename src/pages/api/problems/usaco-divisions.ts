import { NextApiRequest, NextApiResponse } from "next";
import { queryUsacoDivisionProblems } from "../../../../src/lib/queryContent";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const problems = await queryUsacoDivisionProblems();
    console.log(problems[0]);
    // Set cache headers for 1 hour
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json({ problems });
  } catch (error) {
    console.error("Error in USACO divisions API:", error);
    res.status(500).json({ error: "Failed to load USACO division problems" });
  }
}
