import { type } from "arktype";
import TurndownService from "turndown";
import { generateText } from "../../agent/ai";
import { resolveModel } from "../../agent/model";
import { ark } from "../../ark";
import { awsServices } from "./spec";

export const queryAWSDocs = ark.tool({
  description:
    "query an AWS service's SDK documentation to understand how to work with its API",
  parameters: type({
    serviceName: type.enumerated(...Object.keys(awsServices)),
    resourceName: "string",
    query: "string",
  }),
  execute: async ({ serviceName, resourceName, query }) => {
    console.log(`\nQuerying docs for ${serviceName} ${resourceName}:`, query);
    const serviceNameLower = serviceName.toLowerCase();
    const url = `https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/${serviceNameLower}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
    const markdown = turndownService.turndown(html);

    // Use AI to analyze the docs and extract relevant API information
    const model = await resolveModel("gpt-4o");
    const apiSummary = await generateText({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at analyzing AWS SDK documentation and identifying relevant APIs for CloudFormation resource implementations.",
        },
        {
          role: "user",
          content: `Please analyze the AWS SDK v3 documentation for the ${serviceName} service and identify APIs that would be relevant for implementing the ${resourceName} resource's CRUD lifecycle.

Requirements for the CRUD lifecycle:
${query}

For each relevant API, extract:
1. The command name (e.g., CreateUserCommand, DeleteRoleCommand)
2. A brief description of what it does
3. The Input type name (e.g. CreateUserCommandInput)
4. The Output type name (e.g. CreateUserCommandOutput)

Also include the written documentation for the API.

Documentation:
${markdown}`,
        },
      ],
    });
    console.log(apiSummary.text);
    return apiSummary.text;
  },
});
