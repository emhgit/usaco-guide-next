import Wrapper, {
  GroupPageWrapper,
} from "../../../components/Groups/GroupWrappers";
import { useRouter } from "next/router";
import GroupLeaderboardPage from "../../../components/Groups/GroupLeaderboardPage/GroupLeaderboardPage";

const leaderboard = () => {
  const router = useRouter();
  const { id } = router.query;
  return (
    <Wrapper>
      <GroupPageWrapper groupId={id as string}>
        <GroupLeaderboardPage />
      </GroupPageWrapper>
    </Wrapper>
  );
};

export default leaderboard;
