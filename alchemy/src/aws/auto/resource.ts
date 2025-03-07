import type { CoreMessage, Tool } from "ai";
import { type Context, Resource } from "alchemy";
import { type } from "arktype";
import { $ } from "bun";
import { kebabCase } from "change-case";
import fs from "node:fs/promises";
import path from "node:path";
import { generateObject, generateText, streamText } from "../../agent/ai";
import { resolveModel } from "../../agent/model";
import { ark } from "../../ark";
import { extractTypeScriptCode, validateTypeScript } from "../../typescript";
import { installDependencies } from "../../typescript/install-dependencies";
import { queryAWSDocs } from "./query-docs";
import type { CfnResource } from "./spec";
import { loadTerraform } from "./terraform";

export type AWSResourceInput = {
  designDir: string;
  srcDir: string;
  testDir: string;
  rootDir: string;
  serviceName: string;
  resource: CfnResource;
};

export type DesignItem = typeof DesignItem.infer;
export const DesignItem = type({
  number: type("string").describe(
    "The section number, e.g. 1, 1.1, 1.2, 2, 2.1, 2.2, etc.",
  ),
  title: type("string").describe("The title of the section."),
  content: type("string").describe("The content of the section."),
}).describe(["A list of DesignItem containing items to upsert."].join(" "));

export interface Design {
  path: string;
  items: {
    [sectionNumber: string]: DesignItem;
  };
}
export type DesignOutput = typeof DesignOutput.infer;
export const DesignOutput = type({
  items: DesignItem.array().describe(
    "A list of DesignItem containing items to upsert.",
  ),
});

const Brief = type("string").describe(
  "A brief description of the changes to make.",
);

export interface Tests {
  path: string;
  imports: string;
  constants?: string;
  cases: {
    [testName: string]: string | undefined;
  };
}

export interface Implementation {
  path: string;
  imports: string;
  constants: string;
  input: string;
  output: string;
  resource: string;
  helpers: {
    [helperName: string]: string;
  };
}

export interface AWSResourceOutput {
  design: Design;
  tests?: Tests;
  implementation: Implementation;
}

export class AWSResource extends Resource(
  "cfn-resource",
  async (
    ctx: Context<AWSResourceOutput>,
    props: AWSResourceInput,
  ): Promise<AWSResourceOutput | undefined> => {
    if (ctx.event === "delete") {
      return;
    }

    const o3Mini = await resolveModel("o3-mini");
    const claude37Sonnet = await resolveModel("claude-3-7-sonnet-latest");

    const implFile = path.join(
      props.srcDir,
      `${kebabCase(props.resource.ResourceName)}.ts`,
    );
    const testFile = path.join(
      props.testDir,
      `${kebabCase(props.resource.ResourceName)}.test.ts`,
    );
    const designFile = path.join(
      props.designDir,
      `${kebabCase(props.resource.ResourceName)}.md`,
    );

    const initDesign = async (): Promise<Design> => {
      const prompt = `Due to problems relying on the AWS CloudFormation Service, we have decided
to reproduce the CRUD lifecycle of the ${props.resource.ResourceName} resource locally using
TypeScript and the AWS SDK v3.

Before proceeding, we need to clearly define the requirements for this Resource's lifecycle handler, covering the following aspects:
1. Input and Output contract. These are the input properties that are accepted by CloudFormation
and the output Attributes produced and referenceable after the resource has been created. Don't be lazy by just referencing the documentation, you should describe the property and its behavior explicitly in the requirements document.
2. Update lifecycle for each property. This determines the behavior of the CRUD lifecycle when
a property changes, e.g. when a resource must be REPLACED when a property changes, or whether it can be mutated with a PUT.
3. AWS APIs that must be called to create this "CloudFormation Resource". This is not always 1:1, e.g. an IAM Role may have Policies that need to be created and attached.
4. Waiting for stabilization - AWS resources can take time to fully stabilize and be ready for use. Our Resource should wait and poll until the resource is ready. Please identify the resources that require stabilization check and which API call can be used to check the status reliably.
Note: ideally, stabilization checks are performed downstream where they are used (i.e. optimistically instead of pessimistically), so we should analyze this Resource's upstream dependencies and define any checks that should be performed.
5. Create, Update and Delete lifecycle procedure. What operations should be performed on CREATE, UPDATE and DELETE?
6. Error handling. Point out specific error codes for AWS APIs that require special handling an describe how.

Don't be vague. This is a specific requirements doc. Information like "robust" blah-blah is not relevant. Simply focus on the details of the AWS Resource, its contract, composite parts, error handling and lifecycle.

Based on analysis of the Terraform AWS Provider implementation below, be sure to identify:
- Important edge cases and error conditions that need special handling
- API call patterns and sequences that have been proven to work
- Stabilization and wait conditions that are necessary
- Any specific error codes or scenarios that require retry logic or special handling

Here is the relevant Terraform implementation:
${terraform}

Below is the CloudFormation Resource Specification for the ${props.resource.ResourceName} resource:
${JSON.stringify(props, null, 2)}

Produce a flat JSON object representing the requirements document where the keys are the document's section numbers, e.g. 1, 1.1, 1.2, 1.2.3, 2, 2.1, 2.2, etc. and the values are the section's content.

Each point should be its own sub-section. Granular sub-sections (vs large monolithic sections) help refer and edit the requirements alter.`;

      const result = await generateObject({
        model: o3Mini,
        schema: ark.schema(DesignOutput),
        messages: [{ role: "user", content: prompt }],
      });

      const design = {
        path: designFile,
        items: Object.fromEntries(
          result.object.items.map((item) => [item.number, item]),
        ),
      };
      await write(design);
      return design;
    };

    const terraform = await loadTerraform({
      rootDir: props.rootDir,
      serviceName: props.resource.ServiceName,
      resourceName: props.resource.ResourceName,
      cfnSpec: props.resource,
    });

    const design = ctx.output?.design ?? (await initDesign());
    const input = props.resource.ResourceName + "Input";
    const output = props.resource.ResourceName + "Output";
    const resourceName = props.resource.ResourceName;
    const serviceName = props.resource.ServiceName;
    const impl: Implementation = ctx.output?.implementation ?? {
      path: implFile,
      imports: [
        'import { type Context, Resource } from "alchemy";',
        `import { ${serviceName}Client } from "@aws-sdk/client-${serviceName}";`,
      ].join("\n"),
      constants: ["const client = new ${serviceName}Client({});"].join("\n\n"),
      input: [
        `export interface ${input} {`,
        "  // TODO: add input properties",
        "}",
      ].join("\n\n"),
      output: [
        `export interface ${output} {`,
        "  // TODO: add output properties",
        "}",
      ].join("\n\n"),
      resource: [
        `export class ${resourceName} extends Resource(`,
        `  "${serviceName}.${resourceName}",`,
        `  async (ctx: Context<${input}, ${output}>, props: ${input}): Promise<${output} | void> => {`,
        "    // TODO: implement the resource lifecycle handler",
        "    throw new Error('Not implemented');",
        "  }",
        ") {}",
      ].join("\n"),
      helpers: {},
    };
    const test = ctx.output?.tests ?? {
      path: testFile,
      imports: [
        "import { describe, it, expect } from 'bun:test';",
        `import { apply, destroy } from "alchemy";`,
        `import { ${resourceName}Resource } from "${path.relative(testFile, implFile)}";`,
      ].join("\n"),
      cases: {},
    };

    const exampleDir = path.join(props.rootDir, "alchemy", "src", "aws");
    const fewShotExamples = await Promise.all(
      (await fs.readdir(exampleDir))
        .filter((file) => file.endsWith(".ts"))
        .map(async (file) => {
          const content = await fs.readFile(
            path.join(exampleDir, file),
            "utf-8",
          );
          return `// ${file}\n${content}`;
        }),
    );

    async function write(file: Design | Implementation | Tests) {
      console.log(`Writing ${file.path}`);
      await fs.mkdir(path.dirname(file.path), { recursive: true });
      await fs.writeFile(
        file.path,
        file.path === designFile
          ? toMd(file as Design)
          : toTs(file as Implementation | Tests),
      );
    }

    function toMd(design: Design): string {
      // Sort keys by section number
      const sortedKeys = Object.keys(design.items).sort((a, b) => {
        const aParts = a.split(".").map(Number);
        const bParts = b.split(".").map(Number);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) {
            return aVal - bVal;
          }
        }
        return 0;
      });

      // Convert to markdown with appropriate heading levels
      return sortedKeys
        .map((key) => {
          const level = key.split(".").length;
          const hashes = "#".repeat(level);
          const item = design.items[key];
          return `${hashes} ${item.number} - ${item.title}\n${item.content}`;
        })
        .join("\n\n");
    }

    function toTs(ts: Tests | Implementation): string {
      if ("cases" in ts) {
        return [
          "// Imports",
          ts.imports,
          "// Constants",
          ts.constants ?? "// ... we'll add constants here when we need them",
          "// Cases",
          ...Object.entries(ts.cases).flatMap(([name, code]) =>
            code === undefined ? [] : [`// Case ${name}`, code],
          ),
        ].join("\n\n");
      } else {
        return [
          "// Imports",
          ts.imports,
          "// Constants",
          ts.constants ?? "// ... we'll add constants here when we need them",
          "// Input",
          ts.input,
          "// Output",
          ts.output,
          "// Resource",
          ts.resource,
          "// Helpers",
          ...Object.values(ts.helpers).filter((h) => !!h),
        ].join("\n\n");
      }
    }

    function createUpdatePrompt({
      messages,
      responsibility,
      file,
      section,
      brief,
    }: {
      messages: CoreMessage[];
      responsibility: string;
      file: Implementation | Tests;
      section: string;
      brief: string;
    }): CoreMessage[] {
      return [
        {
          role: "system",
          content: [
            "You are an expert TypeScript developer.",
            `You have one single responsibility: ${responsibility}`,
            "You produce a single code block containing the updated code segment (excluding surrounding code).",
          ].join("\n"),
        },
        ...messages.filter((m) => m.role !== "system"),
        {
          role: "user",
          content: [
            "Here is the current file being edited:",
            "```ts",
            toTs(file),
            "```",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "I need you to update this specific part of the file:",
            "```ts",
            section,
            "```",
            "Format your response with a single ```ts code block containing the entire updated constants section.",
            "Do not include code from any other part of the file.",
          ].join("\n"),
        },
        {
          role: "assistant",
          content: "Got it, I can do that. What should I change?",
        },
        {
          role: "user",
          content: brief,
        },
      ];
    }

    async function generateTypeScript({
      messages,
    }: {
      tools?: Record<string, Tool>;
      messages: CoreMessage[];
    }) {
      while (true) {
        const result = await generateText({
          model: claude37Sonnet,
          messages,
        });
        const code = extractTypeScriptCode(result.text);
        if (code) {
          console.log(`Generated code:\n${code}`);
          return code;
        } else {
          messages.push(
            { role: "assistant", content: result.text },
            { role: "user", content: "No code returned. Please try again." },
          );
        }
      }
    }

    const updateDesign = ark.tool({
      description:
        "call this when the design needs to be updated to reflect changed requirements or newly learned information.",
      parameters: type({
        upsert: DesignOutput.describe(
          "List of DesignItem containing items to upsert.",
        ),
        delete: type("string[]").describe("IDs of design items to delete."),
      }),
      execute: async ({ upsert, delete: deleteIds }) => {
        console.log("updateDesign", { upsert, deleteIds });
        for (const del of deleteIds ?? []) {
          delete design.items[del];
        }
        for (const item of upsert?.items ?? []) {
          design.items[item.number] = item;
        }
        await write(design);
        return "Design updated.";
      },
    });

    const removeTests = ark.tool({
      description: "call this when the 1..* test cases need to be removed.",
      parameters: type({
        tests: type("string[]").describe("The names of tests to remove."),
      }),
      execute: async ({ tests }) => {
        console.log("removeTests", { tests });
        const removed: string[] = [];
        const notFound: string[] = [];
        for (const test of tests) {
          if (test in tests) {
            delete tests[test as keyof typeof tests];
            removed.push(test);
          } else {
            // TODO: perhaps add test ids to make it easier to identify with less tokens
            notFound.push(test);
          }
        }
        await write(test);
        return notFound.length > 0
          ? `Removed:\n* ${removed.join("\n* ")}\nNotFound:\n* ${notFound.join("\n* ")}`
          : `Removed:\n* ${removed.join("\n* ")}`;
      },
    });

    const runTests = ark.tool({
      description: "call this to run all or selected test cases.",
      parameters: type({
        cases: type("string[]").describe(
          "The names of test cases to run. Leave empty to run all.",
        ),
      }),
      execute: async ({ cases }) => {
        console.log("runTests", { cases });
        const io = await $`bun test ${testFile} ${
          cases ? `-t ${cases.join(" ")}` : ""
        }`;
        return `EXIT CODE: ${io.exitCode}\nSTDOUT:\n${io.stdout}\nSTDERR:\n${io.stderr}`;
      },
    });

    const upsertTestCase = ark.tool({
      description: "call this to insert/update a test case.",
      parameters: type({
        case: type("string").describe(
          [
            "The test case to upsert.",
            "Must be a unique string.",
            "String is the format that will be placed in a it('<name>', async () => { ... }) call.",
          ].join(" "),
        ),
      }),
      execute: async ({ case: _case }, { messages }) => {
        console.log("upsertTestCase", { _case });
        const code = await generateTypeScript({
          messages: [
            {
              role: "system",
              content: [
                "You are an expert TypeScript developer.",
                "You are given a test name and a list of existing tests",
                "The test is for Alchemy, an Infrastructure-as-Code tool.",
                "Tests should follow the following convention:",
                "```ts",
                `let resource = new ${resourceName}("<unique-id>", { <props> });`,
                "// call apply to run the resource's lifecycle handler, get the output properties",
                `const output = await apply(resource)`,
                "// run whatever assertions you need here",
                "expect(output).toMatchObject({ <expected-output> })",
                "// call destroy to delete the resource",
                `await destroy(resource)`,
                "```",
                "Optionally, you may wish to re-instantiate the resource with updated properties and re-apply to test the resource's UPDATE lifecycle.",
                "```ts",
                `resource = new ${resourceName}("<unique-id>", { <updated-props> });`,
                "// call apply to run the resource's lifecycle handler, get the output properties",
                `const output = await apply(resource)`,
                "// run whatever assertions you need here",
                "expect(output).toMatchObject({ <expected-output> })",
                "```",
              ].join("\n"),
            },
            // strip the system prompt
            ...messages.filter((m) => m.role !== "system"),
            {
              role: "user",
              content: [
                "Here is the current test file (with this test omitted):",
                "```ts",
                toTs({
                  ...test,
                  cases: {
                    ...test.cases,
                    // omit this test
                    [_case]: undefined,
                  },
                }),
                "```",
              ].join("\n\n"),
            },
            {
              role: "user",
              content: [
                `${_case in test.cases ? "Update" : "Complete"} the test implementation:`,
                "```ts",
                ...(_case in test.cases
                  ? [test.cases[_case]]
                  : [
                      `it("${_case}", async () => {`,
                      "  // TODO: implement the test",
                      "});",
                    ]),
                "```",
                "Format your response with a single ```ts code block containing the entire test's implementation.",
                "You can not edit the whole test file directly, if you need to add imports or constants, use the updateImports or updateConstants tools (respectively).",
                "If you need to install dependencies, use the installDependencies tool.",
              ].join("\n"),
            },
          ],
        });
        test.cases[_case] = code;
        await write(test);
        return code;
      },
    });

    const updateTests = ark.tool({
      description: "call this when the test cases need to be updated.",
      parameters: type({
        goal: Brief,
      }),
      execute: async ({ goal }, { messages }) => {
        console.log(`Updating tests: ${goal}`);
        await generateText({
          model: claude37Sonnet,
          tools: {
            upsertTestCase,
            updateImports: updateImports(test),
            updateConstants: updateConstants(test),
          },
          messages: [
            {
              role: "system",
              content: [
                "Execute the 'updateTestCase', 'updateImports', and 'updateConstants' tools to achieve the goal described in the brief.",
              ].join("\n"),
            },
            ...messages.filter((m) => m.role !== "system"),
            {
              role: "user",
              content: `Goal: ${goal}`,
            },
          ],
        });
      },
    });

    const updateImports = (file: Implementation | Tests) =>
      ark.tool({
        description: "call this when the imports need to be updated.",
        parameters: type({
          brief: Brief,
        }),
        execute: async ({ brief }, { messages }) => {
          console.log(`Updating imports: ${brief}`);
          file.imports = await generateTypeScript({
            messages: createUpdatePrompt({
              messages,
              responsibility:
                "update the import declaration(s) part of a TypeScript file.",
              file,
              section: file.imports,
              brief,
            }),
          });
          await write(file);
          return file.imports;
        },
      });

    const updateConstants = (file: Implementation | Tests) =>
      ark.tool({
        description:
          "call this when the constant declarations need to be updated.",
        parameters: type({
          brief: Brief,
        }),
        execute: async ({ brief }, { messages }) => {
          console.log(`Updating constants: ${brief}`);
          file.constants = await generateTypeScript({
            messages: createUpdatePrompt({
              messages,
              responsibility:
                "update the constant declaration(s) part of a TypeScript file.",
              file,
              section: file.constants ?? "// TODO: add constants",
              brief,
            }),
          });
          await write(file);
          return file.constants;
        },
      });

    const updateContract = ark.tool({
      description:
        "call this when the resource's input/output contract needs to be updated.",
      parameters: type({
        part: type
          .enumerated("input", "output")
          .describe("Which part of the Input/Output contract to update."),
        change: type("string").describe(
          "A brief 1-2 sentence description of the Input/Output contract of the Resource.",
        ),
      }),
      execute: async ({ part, change }, { messages }) => {
        console.log(`Updating ${part} contract: ${change}`);
        impl[part] = await generateTypeScript({
          messages: createUpdatePrompt({
            messages,
            responsibility: `update the ${part} contract of the resource.`,
            file: impl,
            section: impl[part],
            brief: change,
          }),
        });
        await write(impl);
        return impl[part];
      },
    });

    const updateResource = ark.tool({
      description:
        "call this when the resource's lifecycle handler function needs to be changed.",
      parameters: type({
        brief: type("string").describe(
          "A brief description of the changes to make.",
        ),
      }),
      execute: async ({ brief }, { messages }) => {
        console.log(`Updating resource: '${impl.resource}'...`);
        impl.resource = await generateTypeScript({
          messages: createUpdatePrompt({
            messages,
            responsibility: "update the resource's lifecycle handler function.",
            file: impl,
            section: impl.resource,
            brief,
          }),
        });
        await write(impl);
        return impl.resource;
      },
    });

    const upsertHelper = ({
      description,
      helpers,
    }: {
      description: string;
      helpers: Record<string, string>;
    }) =>
      ark.tool({
        description,
        parameters: type({
          helper: type("string").describe(
            "The name of the helper function to upsert.",
          ),
          brief: type("string").describe(
            "A brief description of the changes to make.",
          ),
        }),
        execute: async ({ helper, brief }, { messages }) => {
          console.log(`Upserting helper: '${helper}'...`);
          helpers[helper] = await generateTypeScript({
            messages: createUpdatePrompt({
              messages,
              responsibility: `${helpers[helper] ? "update" : "implement"} the helper function ${helper}.`,
              file: impl,
              section: impl.helpers[helper],
              brief,
            }),
          });
          return helpers[helper];
        },
      });

    const typeCheck = ark.tool({
      description:
        "call this when the resource's TypeScript type needs to be checked.",
      parameters: type({}),
      execute: async (_, { messages }) => {
        console.log("Type checking...");
        await validateTypeScript({
          filePath: implFile,
          fileContent: toTs(impl),
        });
      },
    });

    const updateImpl = ark.tool({
      description:
        "call this when the resource's implementation needs to be changed.",
      parameters: type({
        change: type("string").describe("A brief description of the change."),
      }),
      execute: async ({ change }, { messages }) => {
        console.log("Updating implementation...");
        while (true) {
          const result = await generateText({
            model: claude37Sonnet,
            tools: {
              updateContract,
              updateImports: updateImports(impl),
              updateConstants: updateConstants(impl),
              updateResource,
              upsertHelper: upsertHelper({
                description:
                  "call this to add or update a helper function needed by the resource lifecycle handler.",
                helpers: impl.helpers,
              }),
              installDependencies,
              runTests,
              typeCheck,
            },
            maxSteps: 100,
            messages: [
              {
                role: "system",
                content: [
                  "You are an expert TypeScript developer for the project, Alchemy.",
                  "Alchemy is an Infrastructure-as-Code tool written in pure ESM-native TypeScript.",
                  `Your job is to execute the following tools one-by-one to implement/update the ${resourceName} resource:`,
                  "1. updateImports",
                  "2. updateResource",
                  "3. upsertHelper",
                  "4. installDependencies",
                  "5. typeCheck",
                  "6. runTests - call this regularly to ensure the resource is working as expected",
                ].join("\n"),
              },
              ...messages.filter((m) => m.role !== "system"),
              {
                role: "user",
                content: change,
              },
            ],
          });
          const code = extractTypeScriptCode(result.text);
          if (!code) {
            messages.push(
              { role: "assistant", content: result.text },
              {
                role: "user",
                content:
                  "No code returned. Please produce the whole code surrounded by a single ```ts code block.",
              },
            );
          }
          console.log(code);
          const errors = await validateTypeScript({
            filePath: implFile,
            fileContent: toTs(impl),
          });
          if (errors) {
            messages.push(
              { role: "assistant", content: result.text },
              { role: "user", content: errors },
              {
                role: "user",
                content:
                  "Please fix the errors and return the total updated implementation.",
              },
            );
          } else {
            await write(impl);
            break;
          }
        }
      },
    });

    const context = `Here is the Terraform Go implementation that we can learn from:
${terraform}

Here are some examples of how this has been done before.
Make sure to follow the same structure and style of defining
input and output contracts as types and then export a class
using the mixin pattern and implement the lifecycle as a function,
using ctx.event to detect CREATE, UPDATE and DELETE events.
Use these as examples but make sure to still use each tool to edit the
code as needed instead of just writing out the whole file in on go.
${fewShotExamples.join("\n")}

One slight difference from the example is that the \`ignore\` and \`Resource\` functions should be imported from alchemy

import { type Context, Resource, ignore } from "alchemy";

Make sure to add an explicit type for Context<T>

async (ctx: Context<OutputType>, props: InputType) => Promise<OutputType> { .. }

It must be the OutputType. This avoids problems like it ctx.output being \`unknown\`.

Another common gotcha is that ctx.outputs only exists when ctx.event is update | delete. You will get type error when it is create.

For reference, here is what the Context object looks like:
export type Context<Outputs> = {
  stage: string;
  resourceID: ResourceID;
  scope: IScope;
  /**
  * Indicate that this resource is being replaced.
  * This will cause the resource to be deleted at the end of the stack's CREATE phase.
  */
  replace(): void;
} & (
| {
  event: "create";
  output?: never;
}
| {
  event: "update" | "delete";
  output: Outputs;
}`;

    async function update() {
      const messages: CoreMessage[] = [
        {
          role: "system",
          content: [
            "You are an expert TypeScript developer for the project, Alchemy.",
            "Alchemy is an Infrastructure-as-Code tool written in pure ESM-native TypeScript.",
            "Your job is to execute the following tools to implement/update the ${props.resource.ResourceName} resource:",
            "1. updateDesign",
            "3. updateImpl",
            "4. upsertTest",
            "5. removeTests",
            "6. runTests",
            "7. queryAWSDocs",
            "Iteratively call these functions until the resource design, implementation and tests are complete, accurate, type check and pass tests.",
            "Some additional context:",
            context,
          ].join("\n"),
        },
        {
          role: "user",
          content: `Call the functions one-by-one to implement the ${props.resource.ResourceName} using TypeScript and AWS SDK V3.

Design:
${toMd(design)}

Implementation:
${toTs(impl)}

Tests:
${toTs(test)}
`,
        },
      ];
      const { textStream } = await streamText({
        model: claude37Sonnet,
        // effort: "high",
        tools: {
          updateDesign,
          updateImpl,
          updateTests,
          removeTests,
          runTests,
          queryAWSDocs,
        },
        messages,
        maxSteps: 100,
      });

      for await (const chunk of textStream) {
        process.stdout.write(chunk);
      }
    }

    await update();
  },
) {}
