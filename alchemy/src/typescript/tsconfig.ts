import { generateObject } from "ai";
import { type } from "arktype";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { File, ModelId, dependenciesAsMessages, resolveModel } from "../agent";
import { arkSchema } from "../agent/ark";
import { rm } from "../fs";
import { Resource } from "../resource";

export const TypeScriptConfigInput = type({
  /**
   * The ID of the model to use for generating tsconfig configuration
   * @default "gpt-4o"
   */
  modelId: ModelId.optional(),

  /**
   * List of requirements for the TypeScript configuration
   * Can include module settings, compilation options, etc.
   */
  requirements: "string[]",

  /**
   * List of dependencies for the TypeScript configuration
   */
  dependencies: File.array().optional(),

  /**
   * Temperature setting for model generation
   * @default 0.3
   */
  temperature: "number?",

  /**
   * Path to the tsconfig.json file to generate
   */
  path: "string",
});

export const TsConfigSchema = type({
  $schema: "string?",
  compilerOptions: type({
    target: type.enumerated(
      "es2015",
      "es2016",
      "es2017",
      "es2018",
      "es2019",
      "es2020",
      "es2021",
      "es2022",
      "esnext",
    ),
    module: type.enumerated(
      "commonjs",
      "es2015",
      "es2020",
      "es2022",
      "esnext",
      "node16",
      "nodenext",
    ),
    lib: "string[]?",
    declaration: "boolean?",
    declarationMap: "boolean?",
    sourceMap: "boolean?",
    outDir: "string?",
    rootDir: "string?",
    strict: "boolean",
    esModuleInterop: "boolean?",
    skipLibCheck: "boolean?",
    forceConsistentCasingInFileNames: "boolean?",
    moduleResolution: type
      .enumerated("node", "node16", "nodenext", "bundler")
      .optional(),
    resolveJsonModule: "boolean?",
    isolatedModules: "boolean?",
    allowJs: "boolean?",
    checkJs: "boolean?",
    noEmit: "boolean?",
    incremental: "boolean?",
    composite: "boolean?",
    tsBuildInfoFile: "string?",
    paths: type({
      "[string]": "string[]",
    }).optional(),
    baseUrl: "string?",
    types: "string[]?",
    typeRoots: "string[]?",
  }),
  include: "string[]?",
  exclude: "string[]?",
  references: type({
    path: "string",
  })
    .array()
    .optional(),
});

export type TypeScriptConfigInput = type.infer<typeof TypeScriptConfigInput>;
export type TsConfigJson = type.infer<typeof TsConfigSchema>;

export const TypeScriptConfigOutput = type({
  path: "string",
  content: "string",
  tsconfig: TsConfigSchema,
});

export type TypeScriptConfigOutput = type.infer<typeof TypeScriptConfigOutput>;

export const TypeScriptConfig = Resource(
  "TSConfig",
  {
    input: TypeScriptConfigInput,
    output: TypeScriptConfigOutput,
  },
  async (ctx, props) => {
    if (ctx.event === "delete") {
      await rm(props.path);
      return;
    }

    console.log(ctx.event === "create" ? "Creating" : "Updating", props.path);

    // Get the appropriate model
    const model = await resolveModel(props.modelId ?? "gpt-4o");

    // Generate the tsconfig configuration using generateObject for type safety
    const result = await generateObject({
      model,
      mode: "json",
      schema: arkSchema(TsConfigSchema),
      temperature: props.temperature ?? 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at creating TypeScript configurations. You will generate a tsconfig.json configuration based on requirements.",
        },
        ...dependenciesAsMessages(props.dependencies),
        {
          role: "user",
          content: `Please generate a tsconfig.json configuration based on these requirements:

Requirements:
${props.requirements.map((req) => `- ${req}`).join("\n")}

Rules:
1. Use modern TypeScript features
2. Enable strict type checking
3. Use ESM modules by default
4. Include source maps for better debugging
5. Infer appropriate settings for declarations, module resolution, and other options based on the requirements
6. Use appropriate paths for source and output directories`,
        },
      ],
    });

    // Ensure the directory exists
    await mkdir(dirname(props.path), { recursive: true });

    const content = JSON.stringify(result.object, null, 2);

    // Write the tsconfig.json file
    await writeFile(props.path, content);

    return {
      path: props.path,
      content,
      tsconfig: result.object,
    };
  },
);
