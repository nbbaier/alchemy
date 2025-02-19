import { generateObject } from "ai";
import { type } from "arktype";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { arkSchema } from "../agent/ark";
import { dependenciesAsMessages } from "../agent/dependencies";
import { File } from "../agent/file-context";
import { ModelId, resolveModel } from "../agent/model";
import { rm } from "../fs";
import { Resource } from "../resource";

export const PackageJsonSchema = type({
  name: "string",
  version: "string",
  description: "string?",
  main: "string?",
  types: "string?",
  type: '"module"',
  scripts: type({ "[string]": "string" }).optional(),
  peerDependencies: type({ "[string]": "string" }).optional(),
  peerDependenciesMeta: type({
    "[string]": type({ optional: "boolean" }),
  }).optional(),
  devDependencies: type({ "[string]": "string" }).optional(),
  keywords: "string[]?",
  author: "string?",
  license: "string?",
  repository: type({
    type: "string",
    url: "string",
  }).optional(),
  exports: "unknown?",
  files: "string[]?",
});

export type PackageJsonInput = type.infer<typeof PackageJsonInput>;

export const PackageJsonInput = type({
  /**
   * List of requirements for the package
   * Can include dependencies, dev dependencies, scripts, etc.
   */
  requirements: "string[]",

  /**
   * List of dependencies for the package
   */
  dependencies: File.array().optional(),

  /**
   * Name of the package
   */
  name: "string",

  /**
   * The ID of the model to use for generating package configuration
   * @default "gpt-4o"
   */
  model: ModelId.optional(),

  /**
   * Temperature setting for model generation
   * @default 0.3
   */
  temperature: "number?",

  /**
   * Path to the package.json file to generate
   */
  path: "string",
});

export type PackageJsonOutput = type.infer<typeof PackageJsonOutput>;
export const PackageJsonOutput = type({
  path: "string",
  content: "string",
  packageJson: PackageJsonSchema,
});

export class PackageJson extends Resource(
  "Package",
  {
    input: PackageJsonInput,
    output: PackageJsonOutput,
  },
  async (ctx, props): Promise<PackageJsonOutput | void> => {
    if (ctx.event === "delete") {
      await rm(props.path);
      return;
    }

    console.log(ctx.event === "create" ? "Creating" : "Updating", props.path);

    // Get the appropriate model
    const model = await resolveModel(props.model ?? "gpt-4o");

    // Generate the package configuration using generateObject for type safety
    const result = await generateObject({
      model,
      mode: "json",
      schema: arkSchema(PackageJsonSchema),
      temperature: props.temperature ?? 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at creating Node.js/TypeScript package configurations. You will generate a package.json configuration based on requirements.",
        },
        ...dependenciesAsMessages(props.dependencies ?? []),
        {
          role: "user",
          content: `Please generate a package.json configuration based on these requirements:

Package name: ${props.name}

Requirements:
${props.requirements.map((req) => `- ${req}`).join("\n")}

Rules:
1. All dependencies must be peer dependencies
2. Use latest stable versions for all dependencies
3. Include standard TypeScript configuration in devDependencies
4. Use "bun" as the package manager
5. Must use ESM modules (type: "module")

Output only the package.json code (do not emit any other files).`,
        },
      ],
    });

    // Ensure the directory exists
    await mkdir(dirname(props.path), { recursive: true });

    const content = JSON.stringify(
      result.object as type.infer<typeof PackageJsonSchema>,
      null,
      2,
    );

    // Write the package.json file
    await writeFile(props.path, content);

    return {
      path: props.path,
      content,
      packageJson: result.object as type.infer<typeof PackageJsonSchema>,
    };
  },
) {}
