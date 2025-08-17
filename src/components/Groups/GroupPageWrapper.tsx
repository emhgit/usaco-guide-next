import { RouteComponentProps } from "@reach/router";
import { ReactElement, useEffect } from "react";
import { useActiveGroup } from "../../hooks/groups/useActiveGroup";
import {
  useFirebaseUser,
  useIsUserDataLoaded,
} from "../../context/UserDataContext/UserDataContext";
import { useSignIn } from "../../context/SignInContext";
import Layout from "../layout";
import TopNavigationBar from "../TopNavigationBar/TopNavigationBar";
import SEO from "../seo";
import Link from "next/link";

interface GroupPageWrapperProps extends RouteComponentProps {
  children: React.ReactNode;
  groupId?: string;
}

export default function GroupPageWrapper(
  props: GroupPageWrapperProps
): ReactElement {
  /* keeps track of current group id and error handling pages
     if that group cannot be accessed for whatever reason*/

  const { activeGroupId, setActiveGroupId, isLoading, groupData } =
    useActiveGroup();
  const firebaseUser = useFirebaseUser();
  const isUserLoaded = useIsUserDataLoaded();
  const { signIn } = useSignIn();
  useEffect(() => {
    setActiveGroupId(props.groupId);
    //remove groupId on exit
    return () => setActiveGroupId(undefined);
  }, []);

  if (isUserLoaded && !firebaseUser?.uid) {
    return (
      <Layout>
        <TopNavigationBar />
        <main className="py-10 text-center">
          <p className="text-2xl font-medium">
            You need to sign in to access groups.{" "}
            <button
              onClick={signIn}
              className="text-blue-600 underline focus:outline-hidden dark:text-blue-300"
            >
              Sign in now
            </button>
          </p>
        </main>
      </Layout>
    );
  }
  if (
    isLoading ||
    activeGroupId !== props.groupId ||
    (groupData && groupData.id !== props.groupId)
  ) {
    return (
      <Layout>
        <TopNavigationBar />
        <SEO title="Loading..." />
        <main className="py-10 text-center">
          <p className="text-2xl font-medium">Loading...</p>
        </main>
      </Layout>
    );
  }
  if (!groupData) {
    return (
      <Layout>
        <TopNavigationBar />
        <SEO title="Group Not Found" />
        <main className="py-10 text-center">
          <p className="text-2xl font-medium">
            Group not found.{" "}
            <Link
              href="/groups"
              className="text-blue-600 underline dark:text-blue-400"
            >
              Return Home.
            </Link>
          </p>
        </main>
      </Layout>
    );
  }

  return <>{props.children}</>;
}
