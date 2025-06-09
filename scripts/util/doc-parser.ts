#!/usr/bin/env bun
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Schema for the structured output from the AI model
const DocumentationSchema = z.object({
  properties: z.array(z.object({
    propertyName: z.string(),
    docstring: z.string(),
    allowedValues: z.array(z.string()).nullable().optional(),
    pattern: z.string().nullable().optional(),
    minLength: z.number().nullable().optional(),
    maxLength: z.number().nullable().optional()
  }))
});

// Schema for return values/attributes documentation
const AttributeDocumentationSchema = z.object({
  attributes: z.array(z.object({
    attributeName: z.string(),
    docstring: z.string()
  }))
});

// Enhanced property info interface
export interface PropertyInfo {
  docstring: string;
  allowedValues?: string[] | null;
  pattern?: string | null;
  minLength?: number | null;
  maxLength?: number | null;
}

// Attribute info interface (simpler - just docstring)
export interface AttributeInfo {
  docstring: string;
}

// Cache for parsed documentation
const documentationCache = new Map<string, Map<string, PropertyInfo>>();
const attributeDocumentationCache = new Map<string, Map<string, AttributeInfo>>();

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
 * Fetches and parses CloudFormation documentation page for attributes/return values using AI
 */
async function parseAttributeDocumentationPage(baseUrl: string): Promise<Map<string, AttributeInfo>> {
  console.log(`Fetching and parsing attribute documentation from: ${baseUrl}`);
  
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
    
    // Use AI to parse the HTML and extract attribute documentation from "Return values" section
    const result = await generateObject({
      model: openai("gpt-4o-mini"), // Fast, cost-effective model
      temperature: 0, // Lowest temperature for deterministic output
      prompt: `You are parsing a CloudFormation resource documentation page. Extract ALL attribute names and their descriptions from the "Return values" section of this HTML content.

Important instructions:
- Look specifically for sections titled "Return values", "Attributes", or similar
- Each attribute should have a name and a description
- Attribute names are typically in code formatting or bold
- Descriptions explain what the attribute contains or represents
- Include ALL attributes you can find in the return values section
- Keep descriptions concise but informative (1-3 sentences)
- Remove any HTML formatting from descriptions
- Ignore input properties - only focus on return values/attributes
- If there's no "Return values" section, return an empty array

HTML Content:
${html}`,
      schema: AttributeDocumentationSchema,
      maxRetries: 5,
    });
    
    // Convert to a Map for easy lookup
    const attributeMap = new Map<string, AttributeInfo>();
    for (const attr of result.object.attributes) {
      attributeMap.set(attr.attributeName, {
        docstring: attr.docstring
      });
    }
    
    console.log(`Parsed ${attributeMap.size} attributes from ${baseUrl}`);
    return attributeMap;
    
  } catch (error) {
    console.error(`Error parsing attribute documentation from ${baseUrl}:`, error);
    throw error;
  }
}

/**
 * Fetches and parses CloudFormation documentation page using AI
 */
async function parseDocumentationPage(baseUrl: string): Promise<Map<string, PropertyInfo>> {
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
      temperature: 0, // Lowest temperature for deterministic output
      prompt: `You are parsing a CloudFormation resource documentation page. Extract ALL property names, their descriptions, and any allowed values from this HTML content.

Important instructions:
- Look for sections that describe properties, parameters, or attributes
- Each property should have a name and a description
- Property names are typically in code formatting or bold
- Descriptions explain what the property does, its purpose, or constraints
- Include ALL properties you can find, even if some descriptions are brief
- Be thorough - missing properties will cause validation failures
- Keep descriptions concise but informative (1-3 sentences)
- Remove any HTML formatting from descriptions

ALLOWED VALUES EXTRACTION:
- Look for "Allowed values:", "Valid values:", "Possible values:", or similar phrases
- Extract the exact string values that are allowed for each property
- Only include literal string values, not patterns or ranges
- Common patterns include: "ENABLED | DISABLED", "true | false", "ACTIVE | INACTIVE"
- If a property has allowed values, include them in the allowedValues array
- If no allowed values are specified, set allowedValues to null or omit the field entirely
- DO NOT include regex patterns or format specifications in allowedValues

PATTERN EXTRACTION:
- Look for "Pattern:", "Format:", "Regex:", "Regular expression:", or similar phrases
- Extract regex patterns that define valid formats for string values
- Common patterns include format specifications like "^[a-zA-Z0-9\-_]+$" or date formats
- Only include actual regex patterns, not literal string values
- If a property has a pattern constraint, include it in the pattern field
- If no pattern is specified, set pattern to null or omit the field entirely

LENGTH CONSTRAINTS EXTRACTION:
- Look for "Minimum length:", "Min length:", "Maximum length:", "Max length:", or similar phrases
- Extract numeric values that specify minimum and maximum string lengths
- Common formats include "Minimum length: 1", "Maximum length: 255", "Length: 1-64 characters"
- If a property has minimum length constraint, include it in the minLength field
- If a property has maximum length constraint, include it in the maxLength field
- If no length constraints are specified, set minLength/maxLength to null or omit the fields entirely
- Only extract actual numeric values, not descriptive text

HTML Content:
${html}`,
      schema: DocumentationSchema,
      maxRetries: 5,
      experimental_repairText: async (input) => {
        const json = JSON.parse(input.text);
        
        // Map over properties and remove null values from allowedValues arrays
        if (json.properties && Array.isArray(json.properties)) {
          json.properties = json.properties.map((property: any) => {
            if (property.allowedValues && Array.isArray(property.allowedValues)) {
              property.allowedValues = property.allowedValues.filter((value: any) => value !== null);
            }
            return property;
          });
        }
        
        return JSON.stringify(json, null, 2);
      }
    });
    
    // Convert to a Map for easy lookup
    const propertyMap = new Map<string, PropertyInfo>();
    for (const prop of result.object.properties) {
      propertyMap.set(prop.propertyName, {
        docstring: prop.docstring,
        allowedValues: prop.allowedValues || undefined, // Convert null to undefined for consistency
        pattern: prop.pattern || undefined, // Convert null to undefined for consistency
        minLength: prop.minLength || undefined, // Convert null to undefined for consistency
        maxLength: prop.maxLength || undefined // Convert null to undefined for consistency
      });
    }
    
    console.log(`Parsed ${propertyMap.size} properties from ${baseUrl}`);
    return propertyMap;
    
  } catch (error) {
    console.error(`Error parsing documentation from ${baseUrl}:`, error);
    throw error;
  }
}

/**
 * Gets documentation for a specific attribute from a CloudFormation documentation URL
 */
export async function getAttributeDocumentation(
  documentationUrl: string,
  attributeName: string,
  requiredAttributes: string[]
): Promise<AttributeInfo | null> {
  const baseUrl = extractBaseUrl(documentationUrl);
  
  // Check cache first
  let attributeMap = attributeDocumentationCache.get(baseUrl);
  
  if (!attributeMap) {
    // Parse the documentation page
    try {
      attributeMap = await parseAttributeDocumentationPage(baseUrl);
      attributeDocumentationCache.set(baseUrl, attributeMap);
    } catch (error) {
      throw error;
    }
  }
  
  // Validate that all required attributes have documentation
  const missingAttributes = requiredAttributes.filter(attr => !attributeMap?.has(attr));
  
  if (missingAttributes.length > 0) {
    console.warn(`Missing documentation for attributes: ${missingAttributes.join(', ')} in ${baseUrl}`);
    console.log(`Available attributes: ${Array.from(attributeMap.keys()).join(', ')}`);
    
    // Invalidate cache and retry once
    attributeDocumentationCache.delete(baseUrl);
    try {
      console.log(`Retrying attribute documentation parsing for ${baseUrl}...`);
      attributeMap = await parseAttributeDocumentationPage(baseUrl);
      attributeDocumentationCache.set(baseUrl, attributeMap);
      
      // Check again for missing attributes
      const stillMissingAttributes = requiredAttributes.filter(attr => !attributeMap?.has(attr));
      if (stillMissingAttributes.length > 0) {
        console.warn(`Still missing attribute documentation after retry: ${stillMissingAttributes.join(', ')}`);
      }
    } catch (retryError) {
      console.error(`Retry failed for ${baseUrl}:`, retryError);
      return null;
    }
  }
  
  return attributeMap.get(attributeName) || null;
}

/**
 * Gets documentation for a specific property from a CloudFormation documentation URL
 */
export async function getPropertyDocumentation(
  documentationUrl: string,
  propertyName: string,
  requiredProperties: string[]
): Promise<PropertyInfo | null> {
  const baseUrl = extractBaseUrl(documentationUrl);
  
  // Check cache first
  let propertyMap = documentationCache.get(baseUrl);
  
  if (!propertyMap) {
    // Parse the documentation page
    try {
      propertyMap = await parseDocumentationPage(baseUrl);
      documentationCache.set(baseUrl, propertyMap);
    } catch (error) {
      throw error;
    }
  }
  
  // Validate that all required properties have documentation
  const missingProperties = requiredProperties.filter(prop => !propertyMap?.has(prop));
  
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
      const stillMissingProperties = requiredProperties.filter(prop => !propertyMap?.has(prop));
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
  attributeDocumentationCache.clear();
}

/**
 * Gets the current cache size (useful for debugging)
 */
export function getCacheInfo(): { urls: number, totalProperties: number, totalAttributes: number } {
  let totalProperties = 0;
  for (const propertyMap of documentationCache.values()) {
    totalProperties += propertyMap.size;
  }
  
  let totalAttributes = 0;
  for (const attributeMap of attributeDocumentationCache.values()) {
    totalAttributes += attributeMap.size;
  }
  
  return {
    urls: documentationCache.size + attributeDocumentationCache.size,
    totalProperties,
    totalAttributes
  };
}