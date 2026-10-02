export interface ForumImage {
  path: string;
  url: string;
}

export const MAX_FORUM_IMAGES = 4;
export const MAX_FORUM_IMAGE_SIZE = 5 * 1024 * 1024;
export const FORUM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const FORUM_IMAGE_MARKER = /\n?<!--batchlogg-forum-image:([^>\r\n]+)-->/g;
const IMAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export function encodeForumContent(body: string, imagePaths: string[]) {
  const text = body.trim();
  const markers = imagePaths.map((path) => `<!--batchlogg-forum-image:${path}-->`);
  return [text, ...markers].filter(Boolean).join("\n");
}

export function decodeForumContent(body: string) {
  const imagePaths: string[] = [];
  const text = body
    .replace(FORUM_IMAGE_MARKER, (marker, path: string) => {
      if (!IMAGE_PATH_PATTERN.test(path)) return marker;
      imagePaths.push(path);
      return "";
    })
    .trimEnd();
  return { body: text, imagePaths };
}
