#!/usr/bin/env bun
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Schema for the structured output from the AI model
const DocumentationSchema = z.object({
  properties: z.array(z.object({
    propertyName: z.string(),
    docstring: z.string()
  }))
});

// Cache for parsed documentation
const documentationCache = new Map<string, Map<string, string>>();

/**
 * Extracts the base URL from a CloudFormation documentation link
 */
function extractBaseUrl(documentationUrl: string): string {
  try {
    const url = new URL(documentationUrl);
    // Remove the hash fragment to get the base page URL
    return `${url.protocol}//${url.host}${url.pathname}${url.search}`;
  } catch (error) {
    throw new Error(`Invalid documentation URL: ${documentationUrl}`);
  }
}

/**
 * Fetches and parses CloudFormation documentation page using AI
 */
async function parseDocumentationPage(baseUrl: string): Promise<Map<string, string>> {
  console.log(`Fetching and parsing documentation from: ${baseUrl}`);
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required for enhanced documentation parsing. Set it to use AI-powered documentation extraction.");
  }
  
  try {
    // Fetch the HTML content
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${baseUrl}: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Use AI to parse the HTML and extract property documentation
    const result = await generateObject({
      model: openai("gpt-4o-mini"), // Fast, cost-effective model
      prompt: `You are parsing a CloudFormation resource documentation page. Extract ALL property names and their descriptions from this HTML content.

Important instructions:
- Look for sections that describe properties, parameters, or attributes
- Each property should have a name and a description
- Property names are typically in code formatting or bold
- Descriptions explain what the property does, its purpose, or constraints
- Include ALL properties you can find, even if some descriptions are brief
- Be thorough - missing properties will cause validation failures
- Keep descriptions concise but informative (1-3 sentences)
- Remove any HTML formatting from descriptions

HTML Content:
${html}`,
      schema: DocumentationSchema,
    });
    
    // Convert to a Map for easy lookup
    const propertyMap = new Map<string, string>();
    for (const prop of result.object.properties) {
      propertyMap.set(prop.propertyName, prop.docstring);
    }
    
    console.log(`Parsed ${propertyMap.size} properties from ${baseUrl}`);
    return propertyMap;
    
  } catch (error) {
    console.error(`Error parsing documentation from ${baseUrl}:`, error);
    throw error;
  }
}

/**
 * Gets documentation for a specific property from a CloudFormation documentation URL
 */
export async function getPropertyDocumentation(
  documentationUrl: string,
  propertyName: string,
  requiredProperties: string[]
): Promise<string | null> {
  const baseUrl = extractBaseUrl(documentationUrl);
  
  // Check cache first
  let propertyMap = documentationCache.get(baseUrl);
  
  if (!propertyMap) {
    // Parse the documentation page
    try {
      propertyMap = await parseDocumentationPage(baseUrl);
      documentationCache.set(baseUrl, propertyMap);
    } catch (error) {
      console.warn(`Failed to parse documentation for ${baseUrl}, falling back to original documentation`);
      return null;
    }
  }
  
  // Validate that all required properties have documentation
  const missingProperties = requiredProperties.filter(prop => !propertyMap.has(prop));
  
  if (missingProperties.length > 0) {
    console.warn(`Missing documentation for properties: ${missingProperties.join(', ')} in ${baseUrl}`);
    console.log(`Available properties: ${Array.from(propertyMap.keys()).join(', ')}`);
    
    // Invalidate cache and retry once
    documentationCache.delete(baseUrl);
    try {
      console.log(`Retrying documentation parsing for ${baseUrl}...`);
      propertyMap = await parseDocumentationPage(baseUrl);
      documentationCache.set(baseUrl, propertyMap);
      
      // Check again for missing properties
      const stillMissingProperties = requiredProperties.filter(prop => !propertyMap.has(prop));
      if (stillMissingProperties.length > 0) {
        console.warn(`Still missing documentation after retry: ${stillMissingProperties.join(', ')}`);
      }
    } catch (retryError) {
      console.error(`Retry failed for ${baseUrl}:`, retryError);
      return null;
    }
  }
  
  return propertyMap.get(propertyName) || null;
}

/**
 * Clears the documentation cache (useful for testing or forced refresh)
 */
export function clearDocumentationCache(): void {
  documentationCache.clear();
}

/**
 * Gets the current cache size (useful for debugging)
 */
export function getCacheInfo(): { urls: number, totalProperties: number } {
  let totalProperties = 0;
  for (const propertyMap of documentationCache.values()) {
    totalProperties += propertyMap.size;
  }
  
  return {
    urls: documentationCache.size,
    totalProperties
  };
}