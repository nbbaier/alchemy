import { format } from "node:util";
import packageJson from "../../package.json" with { type: "json" };
import type { Phase } from "../alchemy.ts";
import { dedent } from "./dedent.ts";

export type Task = {
  prefix?: string;
  prefixColor?: string;
  resource?: string;
  message: string;
  status?: "pending" | "success" | "failure";
};

export type LoggerApi = {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  task: (id: string, data: Task) => void;
  exit: () => void;
};

type AlchemyInfo = {
  phase: Phase;
  stage: string;
  appName: string;
};

let loggerApi: LoggerApi | null = null;
export const createLoggerInstance = (alchemyInfo: AlchemyInfo, customLogger?: LoggerApi) => {
  if (loggerApi) return loggerApi;

  // Use custom logger if provided, otherwise use the basic fallback logger
  loggerApi = customLogger ?? createFallbackLogger(alchemyInfo);
  return loggerApi;
};

export const createDummyLogger = (): LoggerApi => {
  return {
    log: () => {},
    error: () => {},
    warn: () => {},
    task: () => {},
    exit: () => {},
  };
};

export const createFallbackLogger = (alchemyInfo: AlchemyInfo): LoggerApi => {
  console.log(dedent`
    Alchemy (v${packageJson.version})
    App: ${alchemyInfo.appName}
    Phase: ${alchemyInfo.phase}
    Stage: ${alchemyInfo.stage}
    
  `);

  return {
    log: console.log,
    error: console.error,
    warn: console.warn,
    task: () => {},
    exit: () => {},
  };
};

export const formatFQN = (fqn: string) => fqn.split("/").slice(2).join(" > ");