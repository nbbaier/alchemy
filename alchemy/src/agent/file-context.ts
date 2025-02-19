import { type } from "arktype";

export type File = typeof File.infer;
export const File = type({
  path: "string",
  content: "string",
});
