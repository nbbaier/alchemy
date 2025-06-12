import React, { useState, useEffect } from 'react';
import { render, Text, Box, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { format } from 'node:util';

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
  phase: string;
  stage: string;
  appName: string;
  version: string;
};

// Task management state
interface TaskState {
  [id: string]: Task;
}

interface LogEntry {
  id: string;
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: Date;
}

// Main CLI component
const AlchemyCLI: React.FC<{ 
  alchemyInfo: AlchemyInfo;
  onExit?: () => void;
}> = ({ alchemyInfo, onExit }) => {
  const [tasks, setTasks] = useState<TaskState>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExiting, setIsExiting] = useState(false);
  const { exit } = useApp();

  // Handle exit
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      setIsExiting(true);
      onExit?.();
      exit();
    }
  });

  // Global logger API
  const loggerApi: LoggerApi = {
    log: (...args: unknown[]) => {
      const message = format(...args);
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        type: 'log',
        message,
        timestamp: new Date()
      }]);
    },
    warn: (...args: unknown[]) => {
      const message = format(...args);
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        type: 'warn',
        message,
        timestamp: new Date()
      }]);
    },
    error: (...args: unknown[]) => {
      const message = format(...args);
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        message,
        timestamp: new Date()
      }]);
    },
    task: (id: string, data: Task) => {
      setTasks(prev => ({ ...prev, [id]: data }));
    },
    exit: () => {
      setIsExiting(true);
      onExit?.();
      exit();
    }
  };

  // Store logger globally for external access
  useEffect(() => {
    (global as any).alchemyLogger = loggerApi;
  }, []);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Alchemy</Text>
        <Text> (v{alchemyInfo.version})</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text>App: {alchemyInfo.appName}</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text>Phase: {alchemyInfo.phase}</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text>Stage: {alchemyInfo.stage}</Text>
      </Box>

      {/* Tasks */}
      {Object.entries(tasks).map(([taskId, task]) => (
        <TaskDisplay key={taskId} id={taskId} task={task} />
      ))}

      {/* Logs */}
      {logs.map(log => (
        <LogDisplay key={log.id} log={log} />
      ))}

      {/* Exit indicator */}
      {isExiting && (
        <Box marginTop={1}>
          <Text color="yellow">Exiting...</Text>
        </Box>
      )}
    </Box>
  );
};

// Task display component
const TaskDisplay: React.FC<{ id: string; task: Task }> = ({ task }) => {
  const getStatusIndicator = () => {
    switch (task.status) {
      case 'pending':
        return <Spinner type="dots" />;
      case 'success':
        return <Text color="green">✓</Text>;
      case 'failure':
        return <Text color="red">✗</Text>;
      default:
        return null;
    }
  };

  const getPrefixColor = (color?: string) => {
    switch (color) {
      case 'cyan': return 'cyan';
      case 'yellow': return 'yellow';
      case 'green': return 'green';
      case 'red': return 'red';
      case 'magenta': return 'magenta';
      default: undefined;
    }
  };

  return (
    <Box>
      {getStatusIndicator()}
      
      {task.prefix && (
        <Text color={getPrefixColor(task.prefixColor)}>
          [{task.prefix}]{' '}
        </Text>
      )}
      
      {task.resource && (
        <Text color="gray">{task.resource} </Text>
      )}
      
      <Text>{task.message}</Text>
    </Box>
  );
};

// Log display component
const LogDisplay: React.FC<{ log: LogEntry }> = ({ log }) => {
  const getLogColor = () => {
    switch (log.type) {
      case 'error': return 'red';
      case 'warn': return 'yellow';
      default: return undefined;
    }
  };

  const getLogPrefix = () => {
    switch (log.type) {
      case 'error': return 'ERROR';
      case 'warn': return 'WARN';
      default: return null;
    }
  };

  return (
    <Box>
      {getLogPrefix() && (
        <Text color={getLogColor()} bold>
          {getLogPrefix()}{' '}
        </Text>
      )}
      <Text color={getLogColor()}>{log.message}</Text>
    </Box>
  );
};

// Global logger instance
let loggerApi: LoggerApi | null = null;

export const createLoggerInstance = (alchemyInfo: AlchemyInfo, customLogger?: LoggerApi) => {
  if (loggerApi) return loggerApi;

  if (customLogger) {
    loggerApi = customLogger;
    return loggerApi;
  }

  // Start the Ink CLI
  const { unmount } = render(
    <AlchemyCLI 
      alchemyInfo={alchemyInfo} 
      onExit={() => unmount()}
    />
  );

  // Return the logger API that was stored globally
  loggerApi = (global as any).alchemyLogger;
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

export const formatFQN = (fqn: string) => fqn.split("/").slice(2).join(" > ");