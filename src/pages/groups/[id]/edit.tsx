import Wrapper, {
  GroupPageWrapper,
} from "../../../components/Groups/GroupWrappers";
import { useRouter } from "next/router";
import EditGroupPage from "../../../components/Groups/EditGroupPage/EditGroupPage";

const edit = () => {
  const router = useRouter();
  const { id } = router.query;
  return (
    <Wrapper>
      <GroupPageWrapper groupId={id as string}>
        <EditGroupPage />
      </GroupPageWrapper>
    </Wrapper>
  );
};

export default edit;
