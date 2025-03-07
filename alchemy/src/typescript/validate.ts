import { dirname, resolve } from "path";
import * as ts from "typescript";

export interface TypeCheckOptions {
  filePath: string;
  fileContent?: string;
  tsconfigPath?: string;
  projectRoot?: string;
}

/**
 * Validates TypeScript code and returns formatted error messages if there are any type errors
 * @returns Formatted error message if there are errors, undefined if valid
 */
export async function validateTypeScript({
  filePath,
  fileContent,
  ...options
}: TypeCheckOptions): Promise<string | undefined> {
  const projectRoot = options.projectRoot ?? dirname(filePath);
  const tsconfigPath =
    options.tsconfigPath ?? resolve(projectRoot, "tsconfig.json");

  // Load tsconfig.json if it exists
  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmit: true,
  };

  if (ts.sys.fileExists(tsconfigPath)) {
    const { config, error } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (error) {
      throw new Error(`Error reading tsconfig.json: ${error.messageText}`);
    }

    const { options: parsedOptions, errors } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      projectRoot,
    );

    if (errors.length) {
      throw new Error(
        `Error parsing tsconfig.json: ${errors.map((e) => e.messageText).join("\n")}`,
      );
    }

    compilerOptions = parsedOptions;
  }

  // Create a custom compiler host that handles in-memory content
  const compilerHost = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = compilerHost.getSourceFile;
  compilerHost.getSourceFile = (
    fileName: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean,
  ) => {
    // If this is our target file and we have in-memory content, use that
    if (resolve(fileName) === resolve(filePath) && fileContent !== undefined) {
      return ts.createSourceFile(fileName, fileContent, languageVersion);
    }
    // Otherwise fall back to the default behavior
    return originalGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    );
  };

  // Create program with custom host
  const program = ts.createProgram({
    rootNames: [filePath],
    options: compilerOptions,
    host: compilerHost,
  });

  // Get diagnostics
  const diagnostics = [
    ...program.getSemanticDiagnostics(),
    ...program.getSyntacticDiagnostics(),
  ];

  if (diagnostics.length > 0) {
    return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (path) => path,
      getCurrentDirectory: () => projectRoot,
      getNewLine: () => ts.sys.newLine,
    });
  }

  return undefined;
}
