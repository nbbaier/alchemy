# Claude Development Guidelines

This file contains specific guidelines for working with Claude on the Alchemy repository.

## Development Commands

When making changes to the codebase, always run these commands to ensure code quality:

### Linting and Type Checking
```bash
bun run check
```
This runs TypeScript compilation and Biome linting checks.

### Testing
```bash
bun run test
# or for force run:
vitest run
```

### Building
```bash
bun run build
```

## Code Style

- Follow existing TypeScript conventions in the codebase
- Use ESM imports/exports consistently
- Add proper JSDoc documentation for new public APIs
- Follow the existing pattern for Resource implementations

## Testing Guidelines

- Add tests for new resources in the `alchemy/test/` directory
- Use the vitest testing framework
- Follow existing test patterns for API integration tests
- Use appropriate test timeouts for async operations

## Resource Implementation

When implementing new resources:

1. Follow existing patterns (see KVNamespace, D1Database as examples)
2. Implement proper TypeScript types and interfaces
3. Add comprehensive JSDoc documentation with examples
4. Include proper error handling and retry logic
5. Add binding support for Worker integration when applicable

## Pull Request Guidelines

- Ensure all tests pass before submitting
- Run `bun run check` to verify linting and types
- Follow conventional commit message format
- Add examples in the examples/ directory when adding new features