# Contributing to myMerlet

Thank you for your interest in contributing to myMerlet! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/myMerlet.git`
3. Install dependencies: `npm install`
4. Run development mode: `npm start`

## Code Style

- We use **Prettier** for code formatting
- We use **ESLint** for code linting
- Run `npm run format:write` before committing
- Run `npm run lint` to check for issues

### Coding Standards

- Use **TypeScript** for all new code
- Use the **logger utility** instead of console.log:
  ```typescript
  import { logger } from "./utils/logger";
  logger.debug("Debug info"); // Development only
  logger.error("Error"); // Always logged
  ```
- Follow React best practices and hooks guidelines
- Write descriptive commit messages

## Project Structure

- `src/components/` - React components
- `src/services/` - Business logic and API integrations
- `src/helpers/ipc/` - Electron IPC communication
- `src/localization/` - i18n translations
- `src/utils/` - Utility functions

## Adding Features

### 1. IPC Communication

If adding new Electron IPC channels:

1. Create channel definitions in `src/helpers/ipc/your-feature/your-feature-channels.ts`
2. Add context in `src/helpers/ipc/your-feature/your-feature-context.ts`
3. Register listeners in `src/helpers/ipc/your-feature/your-feature-listeners.ts`

### 2. Translations

Add translations for all UI text in `src/localization/i18n.ts`:

```typescript
nl: { yourKey: "Dutch text" },
en: { yourKey: "English text" },
```

### 3. Components

- Place reusable components in `src/components/`
- Use Shadcn UI components when possible
- Follow the existing component structure

## Testing

- Write unit tests for utilities and services
- Run tests: `npm test`
- Run E2E tests: `npm run test:e2e` (requires `npm run package` first)

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run linter and formatter: `npm run lint && npm run format:write`
4. Run tests: `npm test`
5. Commit with a clear message: `git commit -m "feat: add your feature"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Create a Pull Request

## Commit Message Format

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:

```
feat: add student search functionality
fix: resolve drag and drop opacity issue
docs: update README with API configuration
```

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed

## Questions?

Feel free to open an issue for questions or discussions!

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

Thank you for contributing! 🎉
