import assert from "node:assert/strict";
import { test } from "node:test";
import { forumDraftKey, forumTopicHref, parseForumReplyDraft } from "./forumDraft.ts";

test("reply drafts are scoped to the discussion and account, with a separate guest draft", () => {
  assert.notEqual(forumDraftKey("one", "user"), forumDraftKey("two", "user"));
  assert.notEqual(forumDraftKey("one", "user"), forumDraftKey("one", "other"));
  assert.notEqual(forumDraftKey("one", "user"), forumDraftKey("one", null));
  assert.equal(forumDraftKey("one", null), "batchlogg:forum-reply:guest:one");
});

test("reply text, attachment selections, and the image-reselection notice survive storage", () => {
  const draft = { body: "A reply\nwith a second line", attachments: ["recipe:123"], hadImages: true };
  assert.deepEqual(parseForumReplyDraft(JSON.stringify(draft)), draft);
  assert.equal(parseForumReplyDraft(null), null);
  assert.throws(() => parseForumReplyDraft("broken JSON"));
  assert.throws(() => parseForumReplyDraft(JSON.stringify({ body: 10, attachments: [] })));
  assert.throws(() => parseForumReplyDraft(JSON.stringify({ body: "", attachments: [10], hadImages: false })));
});

test("discussion links open a dedicated thread route with an encoded ID", () => {
  assert.equal(forumTopicHref("topic-id"), "/community/forum/topic-id");
  assert.equal(forumTopicHref("a&b"), "/community/forum/a%26b");
});
