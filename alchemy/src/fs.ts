import { type } from "arktype";
import fs from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { ignore } from "./error";
import { Resource } from "./resource";

export class File extends Resource(
  "File",
  {
    input: type({
      path: "string",
      content: "string",
    }),
    output: type("string"),
    example: `const file = new File("file", {
      path: "./file.txt",
      content: "Hello, world!",
    })`,
  },
  async (ctx, { path: filePath, content }) => {
    if (ctx.event === "delete") {
      await ignore("ENOENT", () => fs.promises.unlink(filePath));
    } else {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, content);
    }
    return filePath;
  },
) {}

export class Folder extends Resource(
  "Folder",
  {
    input: type("string"),
    output: type({
      path: "string",
    }),
    example: `const src = new Folder("src", "./src")`,
  },
  async (ctx, dirPath) => {
    if (ctx.event === "delete") {
      // we just do a best effort attempt
      await ignore(["ENOENT", "ENOTEMPTY"], () => fs.promises.rmdir(dirPath));
    } else {
      await ignore("EEXIST", () =>
        fs.promises.mkdir(dirPath, { recursive: true }),
      );
    }
    return { path: dirPath };
  },
) {}

export async function rm(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
