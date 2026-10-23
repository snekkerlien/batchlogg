import ForumClient from "../ForumClient";

export default function DiscussionPage({ params }: { params: { id: string } }) {
  return <ForumClient threadId={params.id} />;
}
