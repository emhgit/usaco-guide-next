import Wrapper, {
  GroupPageWrapper,
} from "../../../components/Groups/GroupWrappers";
import { useRouter } from "next/router";
import JoinLinksPage from "../../../components/Groups/JoinLinksPage/JoinLinksPage";

const joinLinks = () => {
  const router = useRouter();
  const { id } = router.query;
  return (
    <Wrapper>
      <GroupPageWrapper groupId={id as string}>
        <JoinLinksPage />
      </GroupPageWrapper>
    </Wrapper>
  );
};

export default joinLinks;
