# Alchemy CLI

Interactive command-line interface for Alchemy Infrastructure-as-Code, built with React and Ink.

## Overview

This package provides the interactive CLI functionality that was removed from the main `alchemy` package in v0.28.0. It offers a rich terminal experience with real-time task updates, spinners, and colored output.

## Features

- **Interactive Terminal UI**: Built with React and Ink for a modern CLI experience
- **Real-time Task Updates**: Live progress indicators with spinners and status updates
- **Colored Output**: Color-coded messages for different log levels and task states
- **Keyboard Interaction**: Responsive to user input (Ctrl+C to exit)
- **Task Management**: Organized display of tasks with hierarchical resource chains

## Installation

```bash
npm install alchemy-cli
```

## Usage

```typescript
import { createLoggerInstance } from 'alchemy-cli';

const logger = createLoggerInstance({
  phase: 'deploy',
  stage: 'production',
  appName: 'my-app',
  version: '1.0.0'
});

// Use the logger in your Alchemy application
logger.task('resource-1', {
  prefix: 'SETUP',
  prefixColor: 'cyan',
  resource: 'my-resource',
  message: 'Setting up Resource...',
  status: 'pending'
});

logger.log('Regular log message');
logger.warn('Warning message');
logger.error('Error message');
```

## Integration with Alchemy

To use this interactive CLI with your Alchemy applications, pass the logger to your Alchemy options:

```typescript
import { alchemy } from 'alchemy';
import { createLoggerInstance } from 'alchemy-cli';

const logger = createLoggerInstance({
  phase: 'deploy',
  stage: 'production', 
  appName: 'my-app',
  version: '1.0.0'
});

const scope = alchemy({
  logger: logger
});
```

## API

### `createLoggerInstance(alchemyInfo, customLogger?)`

Creates a new interactive CLI logger instance.

**Parameters:**
- `alchemyInfo`: Object containing app information (phase, stage, appName, version)
- `customLogger?`: Optional custom logger implementation

**Returns:** `LoggerApi` instance

### `LoggerApi`

Interface for the logger functionality:

```typescript
interface LoggerApi {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  task: (id: string, data: Task) => void;
  exit: () => void;
}
```

### `Task`

Task data structure:

```typescript
interface Task {
  prefix?: string;          // Status prefix (e.g., 'SETUP', 'UPDATING')
  prefixColor?: string;     // Color for the prefix
  resource?: string;        // Resource name/chain
  message: string;          // Task message
  status?: 'pending' | 'success' | 'failure';
}
```

## Dependencies

- **ink**: Terminal UI framework
- **ink-spinner**: Spinner components for Ink
- **react**: React library for component-based UI

## License

Apache-2.0