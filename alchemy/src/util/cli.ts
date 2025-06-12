import { format } from "node:util";
import packageJson from "../../package.json" with { type: "json" };
import type { Phase } from "../alchemy.ts";
import { dedent } from "./dedent.ts";

export type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "grey"
  | "blackBright"
  | "redBright"
  | "greenBright"
  | "yellowBright"
  | "blueBright"
  | "magentaBright"
  | "cyanBright"
  | "whiteBright";

export type Task = {
  prefix?: string;
  prefixColor?: Color;
  resource?: string;
  message: string;
  status?: "pending" | "success" | "failure";
};

export type LogMessage = {
  id: number;
  text: string;
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

// ANSI escape codes
const ANSI = {
  // Cursor control
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearScreen: "\x1b[2J",
  moveCursor: (row: number, col: number) => `\x1b[${row};${col}H`,
  clearLine: "\x1b[K",
  clearBelow: "\x1b[0J",
  saveCursor: "\x1b[s",
  restoreCursor: "\x1b[u",

  // Colors
  colors: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    grey: "\x1b[90m",
    blackBright: "\x1b[90m",
    redBright: "\x1b[91m",
    greenBright: "\x1b[92m",
    yellowBright: "\x1b[93m",
    blueBright: "\x1b[94m",
    magentaBright: "\x1b[95m",
    cyanBright: "\x1b[96m",
    whiteBright: "\x1b[97m",
  },

  // Styles
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

// Spinner frames
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

class ZeroDepTUI {
  private logs: LogMessage[] = [];
  private tasks: Map<string, Task> = new Map();
  private alchemyInfo: AlchemyInfo;
  private nextId = 1;
  private spinnerIndex = 0;
  private spinnerInterval?: NodeJS.Timeout;
  private isRunning = false;
  private readonly headerRows = 6; // Fixed header size
  private readonly maxLogLines = 10; // Max log lines to show
  private tasksStartRow = 0; // Will be calculated based on screen layout

  constructor(alchemyInfo: AlchemyInfo) {
    this.alchemyInfo = alchemyInfo;
  }

  start(): LoggerApi {
    this.isRunning = true;

    // Calculate layout
    this.tasksStartRow = this.headerRows + this.maxLogLines + 3; // header + logs + separators

    // Hide cursor and clear screen
    process.stdout.write(ANSI.hideCursor + ANSI.clearScreen);

    // Render initial header
    this.renderHeader();

    // Render initial tasks section
    this.renderTasksSection();

    // Start spinner animation
    this.spinnerInterval = setInterval(() => {
      this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER_FRAMES.length;
      this.updateTasksInPlace();
    }, 100);

    return {
      log: (...args: unknown[]) => this.addLog(format(...args)),
      warn: (...args: unknown[]) => this.addLog(format(...args)),
      error: (...args: unknown[]) => this.addLog(format(...args)),
      task: (id: string, data: Task) => this.updateTask(id, data),
      exit: () => this.exit(),
    };
  }

  private colorize(text: string, color?: Color, bold = false): string {
    if (!color) return text;

    const colorCode = ANSI.colors[color] || "";
    const boldCode = bold ? ANSI.bold : "";
    return `${boldCode}${colorCode}${text}${ANSI.reset}`;
  }

  private renderHeader() {
    process.stdout.write(ANSI.moveCursor(1, 1));

    // Simple header without complex box drawing
    process.stdout.write(
      `${this.colorize(`Alchemy (v${packageJson.version})`, "green", true)}\n`,
    );
    process.stdout.write(
      `${this.colorize(`App: ${this.alchemyInfo.appName}`, "gray", true)}\n`,
    );
    process.stdout.write(
      `${this.colorize(`Phase: ${this.alchemyInfo.phase}`, "gray", true)}\n`,
    );
    process.stdout.write(
      `${this.colorize(`Stage: ${this.alchemyInfo.stage}`, "gray", true)}\n`,
    );
    process.stdout.write("\n");
    process.stdout.write(`${this.colorize("Logs", "green", true)}\n`);
  }

  private addLog(text: string) {
    this.logs.push({ id: this.nextId++, text });

    // Keep only the most recent logs to fit in the allocated space
    if (this.logs.length > this.maxLogLines) {
      this.logs = this.logs.slice(-this.maxLogLines);
    }

    // Render logs in their fixed area
    this.renderLogsSection();
  }

  private renderLogsSection() {
    // Position cursor at start of logs area (after header)
    const logsStartRow = this.headerRows + 1;
    process.stdout.write(ANSI.moveCursor(logsStartRow, 1));

    // Clear the logs area
    for (let i = 0; i < this.maxLogLines; i++) {
      process.stdout.write(`${ANSI.clearLine}\n`);
    }

    // Render the logs
    process.stdout.write(ANSI.moveCursor(logsStartRow, 1));
    for (const log of this.logs) {
      process.stdout.write(`${this.colorize(log.text, "gray")}\n`);
    }
  }

  private updateTask(id: string, data: Task) {
    this.tasks.set(id, data);
    this.renderTasksSection();
  }

  private renderTasksSection() {
    // Move to tasks section at fixed position
    process.stdout.write(ANSI.moveCursor(this.tasksStartRow, 1));

    // Clear from this point down to avoid leftover content
    process.stdout.write(ANSI.clearBelow);

    // Render tasks header
    process.stdout.write(`${this.colorize("Tasks", "green", true)}\n`);

    // Render each task
    const taskEntries = Array.from(this.tasks.entries());
    for (const [_id, task] of taskEntries) {
      this.renderTask(task);
    }
  }

  private renderTask(task: Task) {
    let statusIcon: string;

    if (!task.status || task.status === "pending") {
      statusIcon = this.colorize(SPINNER_FRAMES[this.spinnerIndex], "yellow");
    } else if (task.status === "success") {
      statusIcon = this.colorize("✓", "green");
    } else {
      statusIcon = this.colorize("✗", "red");
    }

    let line = ` ${statusIcon}`;

    if (task.prefix) {
      const paddedPrefix = task.prefix.padStart(9);
      line += ` ${this.colorize(paddedPrefix, task.prefixColor || "white", true)}`;
    }

    if (task.resource) {
      line += ` ${this.colorize(`[${task.resource}]`, "gray", true)}`;
    }

    line += ` ${this.colorize(task.message, "white", true)}`;

    process.stdout.write(`${line}\n`);
  }

  private updateTasksInPlace() {
    if (!this.isRunning || this.tasks.size === 0) return;

    // Only update spinner for pending tasks
    let hasPendingTasks = false;
    for (const task of this.tasks.values()) {
      if (!task.status || task.status === "pending") {
        hasPendingTasks = true;
        break;
      }
    }

    if (hasPendingTasks) {
      // Only re-render the tasks section, not the entire screen
      this.renderTasksSection();
    }
  }

  private exit() {
    this.isRunning = false;

    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
    }

    // Show cursor and move to bottom
    process.stdout.write(`${ANSI.showCursor}\n`);
  }
}

let loggerApi: LoggerApi | null = null;

export const createLoggerInstance = (alchemyInfo: AlchemyInfo) => {
  if (loggerApi) return loggerApi;

  if (
    process.env.CI ||
    process.env.USE_FALLBACK_LOGGER ||
    !process.stdin.isTTY
  ) {
    loggerApi = createFallbackLogger(alchemyInfo);
    return loggerApi;
  }

  const tui = new ZeroDepTUI(alchemyInfo);
  loggerApi = tui.start();

  process.on("SIGINT", () => {
    loggerApi?.exit();
    process.exit(0);
  });

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
