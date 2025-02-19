import { type } from "arktype";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import {
  File,
  ModelId,
  dependenciesAsMessages,
  generateText,
  resolveModel,
} from "../agent";
import { rm } from "../fs";
import { Resource } from "../resource";

export const ReasoningEffort = type.enumerated("low", "medium", "high");

export const RequirementsInput = type({
  /**
   * The ID of the model to use for generating requirements documentation
   * @default "gpt-4o"
   */
  modelId: ModelId.optional(),

  /**
   * The effort to put into reasoning about the requirements
   */
  reasoningEffort: ReasoningEffort.optional(),

  /**
   * List of requirements to document and analyze
   */
  requirements: "string[]",

  /**
   * List of dependencies for the requirements document
   */
  dependencies: File.array().optional(),

  /**
   * Temperature setting for model generation (higher = more creative, lower = more focused)
   * @default 0.7
   */
  temperature: "number?",

  /**
   * File path where the requirements document should be written
   */
  file: "string?",
});

export const RequirementsOutput = type({
  /**
   * Generated markdown document containing organized and analyzed requirements
   */
  content: "string",
});

export class Requirements extends Resource(
  "Requirements",
  {
    input: RequirementsInput,
    output: RequirementsOutput,
  },
  async (ctx, props) => {
    if (ctx.event === "delete") {
      if (props.file) {
        await rm(props.file);
      }
      return;
    }

    if (props.file) {
      console.log(
        ctx.event === "create" ? "Designing" : "Revising",
        "requirements",
        props.file,
      );
    }

    // Get the appropriate model based on the ID
    const model = await resolveModel(props.modelId ?? "gpt-4o");

    // Generate the requirements document
    const { text } = await generateText({
      model,
      temperature: props.temperature ?? 0.7,
      maxSteps: 3, // Allow multiple steps for potential tool usage
      providerOptions: props.reasoningEffort
        ? {
            openai: {
              reasoningEffort: props.reasoningEffort,
            },
          }
        : undefined,
      tools: {
        // scrapeWebPage,
      },
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates markdown documents from requirements. You can use the scrapeWebPage tool to get additional requirements from relevant URLs if needed.",
        },
        ...dependenciesAsMessages(props.dependencies ?? []),
        {
          role: "user",
          content: `Please analyze the following system requirements and create a comprehensive, unambiguous markdown document that covers all aspects:

Requirements:
${props.requirements.map((req) => `- ${req}`).join("\n")}

Guidelines:
1. Make explicit decisions for any ambiguous requirements - do not leave open questions
2. Document the reasoning behind key decisions
3. Be specific about technical choices and implementation details
4. Avoid phrases like "could be", "might need", or "possibly requires" - be definitive
5. Organize requirements into logical sections with clear dependencies and relationships

Format the output in markdown with appropriate headers, lists, and sections, starting with the title as an H1 header.
Include technical considerations and implementation details, ensuring every requirement has a clear, actionable specification.`,
        },
      ],
    });

    if (props.file) {
      // Ensure the directory exists
      await mkdir(dirname(props.file), { recursive: true });

      // Write the requirements to the file
      await writeFile(props.file, text);
    }

    return {
      content: text,
    };
  },
) {}
