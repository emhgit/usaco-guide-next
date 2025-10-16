import Wrapper, {
  GroupPageWrapper,
  PostPageWrapper,
} from "../../../../../components/Groups/GroupWrappers";
import { useRouter } from "next/router";
import EditPostPage from "../../../../../components/Groups/EditPostPage/EditPostPage";

const index = () => {
  const router = useRouter();
  const { id, postId } = router.query;
  return (
    <Wrapper>
      <GroupPageWrapper groupId={id as string}>
        <PostPageWrapper postId={postId as string}>
          <EditPostPage groupId={id as string} postId={postId as string} />
        </PostPageWrapper>
      </GroupPageWrapper>
    </Wrapper>
  );
};

export default index;
