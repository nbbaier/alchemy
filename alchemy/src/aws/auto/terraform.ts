import { kebabCase } from "change-case";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { generateObject } from "../../agent/ai";
import { resolveModel } from "../../agent/model";
import type { CfnResource } from "./spec";

export async function loadTerraform({
  rootDir,
  serviceName,
  resourceName,
  cfnSpec,
}: {
  rootDir: string;
  serviceName: string;
  resourceName: string;
  cfnSpec: CfnResource;
}) {
  // Load relevant Terraform provider implementation files for this resource
  const terraformServicePath = path.join(
    rootDir,
    "3p",
    "terraform-provider-aws",
    "internal",
    "service",
    serviceName.toLowerCase(),
  );

  const files = await fs.readdir(terraformServicePath);
  const resourcePrefix = kebabCase(resourceName).toLowerCase();
  const goFiles = files.filter(
    (file) => file.endsWith(".go") && !file.endsWith("_test.go"),
  );

  if (goFiles.length === 0) {
    throw new Error(
      `No Terraform implementation files found for resource ${resourceName} in ${terraformServicePath}. Expected files starting with "${resourcePrefix}"`,
    );
  }

  // Identify relevant files using AI
  const { relevantFiles } = await identifyRelevantFiles(
    resourceName,
    serviceName,
    goFiles,
    resourcePrefix,
    cfnSpec,
  );

  if (relevantFiles.length === 0) {
    throw new Error(
      `No relevant Terraform implementation files identified for resource ${resourceName}`,
    );
  }

  console.log(
    `Found ${relevantFiles.length} relevant files for ${serviceName}::${resourceName}:`,
  );
  for (const file of relevantFiles) {
    console.log(`  - ${file}`);
  }

  const fileContents = await Promise.all(
    relevantFiles.map(async (file) => {
      const content = await fs.readFile(
        path.join(terraformServicePath, file),
        "utf-8",
      );
      return `// ${file}\n${content}`;
    }),
  );

  return fileContents.join("\n\n");
}

const RelevantFilesSchema = z.object({
  /**
   * List of Go file names that are relevant for implementing the CRUD lifecycle
   * for this resource
   */
  relevantFiles: z.array(z.string()),
});

async function identifyRelevantFiles(
  resourceName: string,
  serviceName: string,
  files: string[],
  resourcePrefix: string,
  cfnSpec: CfnResource,
): Promise<z.infer<typeof RelevantFilesSchema>> {
  const model = await resolveModel("gpt-4o");

  const result = await generateObject({
    model,
    schema: RelevantFilesSchema,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are an expert at AWS service implementations and Go code analysis. Your task is to identify ONLY the Go files that are specifically implementing the given AWS resource's CRUD lifecycle, excluding any files that work with other resources.",
      },
      {
        role: "user",
        content: `Please identify which Go files are specifically implementing the CRUD lifecycle for the AWS::${serviceName}::${resourceName} resource.

Available files (all in the ${serviceName.toLowerCase()} package):
${files.map((f) => `- ${f}`).join("\n")}

CloudFormation Resource Specification:
${JSON.stringify(cfnSpec, null, 2)}

Selection Rules:
1. ONLY select files that are specifically implementing this exact resource type (AWS::${serviceName}::${resourceName})
2. Files must handle one or more of:
   - Resource creation and deletion
   - Resource updates and modifications
   - Resource state checking and stabilization
   - Resource validation
3. Strict Exclusions:
   - Test files
   - Files working with other resource types
   - General utility files (unless they are ONLY used by this resource)
   - Files that just happen to share a similar prefix but work with different resources
4. Files should start with the prefix: ${resourcePrefix}

Important: Be very strict about only including files that are specifically working with this exact resource type. If a file works with multiple resources or similar resources, exclude it unless it's absolutely essential for this resource's implementation.

Return ONLY the list of relevant file names.`,
      },
    ],
  });

  return result.object;
}
