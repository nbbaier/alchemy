import {
  Architecture,
  CreateFunctionCommand,
  DeleteFunctionCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  LambdaClient,
  ResourceNotFoundException,
  Runtime,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import fs from "node:fs";
import path from "node:path";
import { ignore } from "../error";
import { type Context, Resource } from "../resource";

async function resolveRegion(client: LambdaClient): Promise<string> {
  const region = client.config.region;
  if (typeof region === "string") return region;
  if (typeof region === "function") return region();
  throw new Error("Could not resolve AWS region");
}

export interface FunctionInput {
  functionName: string;
  zipPath: string;
  roleArn: string;
  handler?: string;
  runtime?: Runtime;
  architecture?: Architecture;
  description?: string;
  timeout?: number;
  memorySize?: number;
  environment?: Record<string, string>;
  tags?: Record<string, string>;
  url?: {
    authType?: "AWS_IAM" | "NONE";
    cors?: {
      allowCredentials?: boolean;
      allowHeaders?: string[];
      allowMethods?: string[];
      allowOrigins?: string[];
      exposeHeaders?: string[];
      maxAge?: number;
    };
  };
}

export interface FunctionOutput extends FunctionInput {
  id: string; // Same as functionName
  arn: string;
  lastModified: string;
  version: string;
  qualifiedArn: string; // ARN with version
  invokeArn: string; // ARN for API Gateway
  sourceCodeHash: string;
  sourceCodeSize: number;
  ephemeralStorageSize?: number;
  architectures: string[];
  masterArn?: string; // Only for Lambda@Edge
  revisionId: string;
  state?: string;
  stateReason?: string;
  stateReasonCode?: string;
  lastUpdateStatus?: string;
  lastUpdateStatusReason?: string;
  lastUpdateStatusReasonCode?: string;
  packageType: string;
  signingProfileVersionArn?: string;
  signingJobArn?: string;
}

export class Function extends Resource(
  "aws.lambda.Function",
  async (ctx: Context<FunctionInput, FunctionOutput>, input: FunctionInput) => {
    const client = new LambdaClient({});
    const region = await resolveRegion(client);

    const code = await zipCode(input.zipPath);

    if (ctx.event === "delete") {
      await ignore(ResourceNotFoundException.name, () =>
        client.send(
          new DeleteFunctionCommand({
            FunctionName: input.functionName,
          }),
        ),
      );

      // Return a minimal FunctionOutput for deleted state
      return {
        ...input,
        id: input.functionName,
        arn: `arn:aws:lambda:${region}:${process.env.AWS_ACCOUNT_ID}:function:${input.functionName}`,
        lastModified: new Date().toISOString(),
        version: "$LATEST",
        qualifiedArn: `arn:aws:lambda:${region}:${process.env.AWS_ACCOUNT_ID}:function:${input.functionName}:$LATEST`,
        invokeArn: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${region}:${process.env.AWS_ACCOUNT_ID}:function:${input.functionName}/invocations`,
        sourceCodeHash: "",
        sourceCodeSize: 0,
        architectures: input.architecture
          ? [input.architecture]
          : [Architecture.x86_64],
        revisionId: "",
        state: "Inactive",
        packageType: "Zip",
      };
    } else {
      try {
        // Check if function exists
        const func = await client.send(
          new GetFunctionCommand({
            FunctionName: input.functionName,
          }),
        );

        if (ctx.event === "update") {
          // Wait for function to stabilize
          await waitForFunctionStabilization(client, input.functionName);

          // Update function code
          await client.send(
            new UpdateFunctionCodeCommand({
              FunctionName: input.functionName,
              ZipFile: code,
            }),
          );

          // Wait for code update to stabilize
          await waitForFunctionStabilization(client, input.functionName);

          // Update function configuration
          await client.send(
            new UpdateFunctionConfigurationCommand({
              FunctionName: input.functionName,
              Handler: input.handler,
              Runtime: input.runtime,
              Role: input.roleArn,
              Description: input.description,
              Timeout: input.timeout,
              MemorySize: input.memorySize,
              Environment: input.environment
                ? { Variables: input.environment }
                : undefined,
            }),
          );

          // Wait for configuration update to stabilize
          await waitForFunctionStabilization(client, input.functionName);
        }
      } catch (error: any) {
        if (error.name === "ResourceNotFoundException") {
          // Create function if it doesn't exist
          const startTime = Date.now();
          let delay = 100; // Start with 100ms delay

          while (true) {
            try {
              await client.send(
                new CreateFunctionCommand({
                  FunctionName: input.functionName,
                  Code: { ZipFile: code },
                  Handler: input.handler || "index.handler",
                  Runtime: input.runtime || Runtime.nodejs20x,
                  Role: input.roleArn,
                  Description: input.description,
                  Timeout: input.timeout || 3,
                  MemorySize: input.memorySize || 128,
                  Environment: input.environment
                    ? { Variables: input.environment }
                    : undefined,
                  Architectures: input.architecture
                    ? [input.architecture]
                    : [Architecture.x86_64],
                  Tags: input.tags,
                }),
              );
              break; // Success - exit retry loop
            } catch (createError: any) {
              if (
                createError.name !== "InvalidParameterValueException" ||
                !createError.message?.includes("cannot be assumed by Lambda")
              ) {
                throw createError; // Different error - rethrow
              }

              if (Date.now() - startTime > 10000) {
                throw new Error(
                  "Timeout waiting for IAM role to be assumable by Lambda after 10s",
                );
              }

              await new Promise((resolve) => setTimeout(resolve, delay));
              delay = Math.min(delay * 2, 1000); // Exponential backoff capped at 1s
            }
          }

          // Wait for function to be active
          let isCreating = true;
          while (isCreating) {
            const config = await client.send(
              new GetFunctionConfigurationCommand({
                FunctionName: input.functionName,
              }),
            );
            isCreating = config.State === "Pending";
            if (isCreating) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        } else {
          throw error;
        }
      }

      // Get complete function details
      const [func, config] = await Promise.all([
        client.send(
          new GetFunctionCommand({
            FunctionName: input.functionName,
          }),
        ),
        client.send(
          new GetFunctionConfigurationCommand({
            FunctionName: input.functionName,
          }),
        ),
      ]);

      const output: FunctionOutput = {
        ...input,
        id: input.functionName,
        arn: config.FunctionArn!,
        lastModified: config.LastModified!,
        version: config.Version!,
        qualifiedArn: `${config.FunctionArn}:${config.Version}`,
        invokeArn: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${config.FunctionArn}/invocations`,
        sourceCodeHash: config.CodeSha256!,
        sourceCodeSize: config.CodeSize!,
        ephemeralStorageSize: config.EphemeralStorage?.Size,
        architectures: config.Architectures || [],
        masterArn: config.MasterArn,
        revisionId: config.RevisionId!,
        state: config.State,
        stateReason: config.StateReason,
        stateReasonCode: config.StateReasonCode,
        lastUpdateStatus: config.LastUpdateStatus,
        lastUpdateStatusReason: config.LastUpdateStatusReason,
        lastUpdateStatusReasonCode: config.LastUpdateStatusReasonCode,
        packageType: config.PackageType!,
        signingProfileVersionArn: config.SigningProfileVersionArn,
        signingJobArn: config.SigningJobArn,
      };

      return output;
    }
  },
) {}

// Helper to wait for function to stabilize
async function waitForFunctionStabilization(
  client: LambdaClient,
  functionName: string,
) {
  while (true) {
    const config = await client.send(
      new GetFunctionConfigurationCommand({
        FunctionName: functionName,
      }),
    );

    // Check if function is in a stable state
    if (config.State === "Active" && config.LastUpdateStatus === "Successful") {
      break;
    }

    // If there's a failure, throw an error
    if (config.State === "Failed" || config.LastUpdateStatus === "Failed") {
      throw new Error(
        `Function failed to stabilize: ${config.StateReason || config.LastUpdateStatusReason}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Helper to zip the code
async function zipCode(filePath: string): Promise<Buffer> {
  const fileContent = await fs.promises.readFile(filePath);
  const fileName = path.basename(filePath);

  // Create a zip buffer in memory
  const zip = new (await import("jszip")).default();
  zip.file(fileName, fileContent);
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    platform: "UNIX",
  });
}
