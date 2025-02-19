import type { CoreMessage } from "ai";
import { type } from "arktype";
import { createPatch, diffLines } from "diff";
import { Folder } from "../fs";
import { Design } from "../markdown/design";
import { Requirements } from "../markdown/requirements";
import { TypeScriptConfig, TypeScriptFile } from "../typescript";
import { PackageJson } from "../typescript/package";
import { Agent } from "./agent";
import { File } from "./file-context";
import { ModelId } from "./model";
import { Prompts } from "./prompts";

export class Module extends Agent(
  "Module",
  {
    model: "o3-mini",
    effort: "high",
    input: type({
      path: "string",
      content: "string",
      model: ModelId.optional(),
      dependencies: File.array().optional(),
    }),
    resources: [
      Design,
      Requirements,
      TypeScriptFile,
      TypeScriptConfig,
      PackageJson,
      Folder,
    ],
  },
  async (ctx, props): Promise<CoreMessage[] | void> => {
    if (ctx.event === "create") {
      return [
        {
          role: "system",
          content: Prompts.program,
        },
        {
          role: "user",
          content: [
            "Derive the execution plan for this document:",
            "```md",
            props.content,
            "```",
            "You must only construct resources for files explicitly mentioned in the document.",
            "Do not preemptively assume that any other files are needed.",
          ].join("\n\n"),
        },
      ];
    } else {
      const newContent = props.content;
      const oldContent = ctx.input.content;
      if (!oldContent) {
        throw new Error("oldContent is undefined");
      }
      if (diffLines(oldContent, newContent).length === 0) {
        return;
      }
      const patch = createPatch(props.path, props.path, oldContent, newContent);

      console.log(patch);
      return [
        {
          role: "system",
          content: Prompts.program,
        },
        {
          role: "user",
          content: [
            "I've made the following changes to the document:",
            "```diff",
            patch,
            "```",
            "Please update the plan to reflect the changes.",
            "You must only include files explicitly mentioned in the document.",
            "Do not preemptively assume that any other files are needed.",
          ].join("\n"),
        } satisfies CoreMessage,
      ];
    }
  },
) {}
