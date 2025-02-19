import fs from "node:fs/promises";
import { type Context, Resource } from "../resource";
import type { ModelId } from "./model";
import { Module } from "./module";

export type ProgramInput = {
  path: string;
  model?: ModelId;
};

export type ProgramOutput = {
  module: Module;
};

export class Program extends Resource(
  "Program",
  {
    alwaysUpdate: true,
  },
  async (ctx: Context<ProgramInput, ProgramOutput>, props) => {
    if (ctx.event === "delete") {
      return;
    }

    const content = await fs.readFile(props.path, "utf-8");

    const module = new Module("module", {
      path: props.path,
      content,
      model: props.model,
    });

    return {
      module,
    };
  },
) {}
