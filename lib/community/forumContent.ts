export interface ForumImage {
  path: string;
  url: string;
}

export interface ForumAttachmentRef {
  type: "recipe" | "batch";
  id: string;
}

export interface ForumAttachment extends ForumAttachmentRef {
  name: string;
  url: string | null;
}

export const MAX_FORUM_IMAGES = 4;
export const MAX_FORUM_IMAGE_SIZE = 5 * 1024 * 1024;
export const FORUM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const FORUM_IMAGE_MARKER = /\n?<!--batchlogg-forum-image:([^>\r\n]+)-->/g;
const FORUM_ATTACHMENT_MARKER =
  /\n?<!--batchlogg-forum-attachment:(recipe|batch):([^>\r\n]+)-->/g;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export function encodeForumContent(
  body: string,
  imagePaths: string[],
  attachments: ForumAttachmentRef[] = []
) {
  const text = body.trim();
  const markers = imagePaths.map((path) => `<!--batchlogg-forum-image:${path}-->`);
  const attachmentMarkers = attachments
    .filter((attachment) => UUID_PATTERN.test(attachment.id))
    .map(
      (attachment) =>
        `<!--batchlogg-forum-attachment:${attachment.type}:${attachment.id}-->`
    );
  return [text, ...markers, ...attachmentMarkers].filter(Boolean).join("\n");
}

export function decodeForumContent(body: string) {
  const imagePaths: string[] = [];
  const attachments: ForumAttachmentRef[] = [];
  const text = body
    .replace(FORUM_IMAGE_MARKER, (marker, path: string) => {
      if (!IMAGE_PATH_PATTERN.test(path)) return marker;
      imagePaths.push(path);
      return "";
    })
    .replace(FORUM_ATTACHMENT_MARKER, (marker, type: ForumAttachmentRef["type"], id: string) => {
      if (!UUID_PATTERN.test(id)) return marker;
      attachments.push({ type, id });
      return "";
    })
    .trimEnd();
  return { body: text, imagePaths, attachments };
}
