# Contributing Guide

Thank you for your interest in contributing to the Production-Ready Boilerplate! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Issues

Before creating an issue, please:
1. Check if the issue already exists
2. Search closed issues to see if it was already resolved
3. Provide as much detail as possible:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Error messages or logs

### Suggesting Features

Feature suggestions are welcome! Please:
1. Check if the feature was already suggested
2. Explain the use case and benefits
3. Consider if it fits the boilerplate's scope (generic, reusable features)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes:**
   - Follow the code style guidelines below
   - Write or update tests as needed
   - Update documentation if necessary

4. **Test your changes:**
   ```bash
   # Frontend
   cd vite-playground
   npm test
   npm run lint
   
   # Backend
   cd server
   npm test
   ```

5. **Commit your changes:**
   ```bash
   git commit -m "feat: add new feature description"
   ```
   Use conventional commit messages (see below)

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request:**
   - Provide a clear description
   - Reference any related issues
   - Include screenshots if UI changes

## Code Style Guidelines

### JavaScript/React

- Use **ES6+** features
- Use **functional components** with hooks (prefer hooks over class components)
- Use **const/let** instead of var
- Use **arrow functions** for callbacks
- Use **template literals** for string concatenation
- Use **destructuring** where appropriate
- Follow existing code patterns and structure

### Naming Conventions

- **Components:** PascalCase (`UserProfile.jsx`)
- **Files:** Match component name or use kebab-case for utilities
- **Variables/Functions:** camelCase (`getUserData`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS Classes:** Use Tailwind utility classes

### Code Formatting

- Use **2 spaces** for indentation
- Use **single quotes** for strings (JavaScript)
- Use **semicolons** at end of statements
- Maximum line length: **100 characters** (soft limit)
- Add trailing commas in objects/arrays

### React Best Practices

- Keep components small and focused
- Extract reusable logic into custom hooks
- Use PropTypes or TypeScript for type checking (if added)
- Avoid prop drilling - use Context when appropriate
- Memoize expensive computations with `useMemo`/`useCallback`

### Backend Best Practices

- Use **async/await** instead of promises chains
- Handle errors appropriately
- Use logger instead of console.log
- Validate all inputs
- Return consistent response formats
- Document complex logic with comments

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(auth): add refresh token functionality

fix(api): handle network timeout errors

docs(readme): update installation instructions

style(components): format code with prettier
```

## Testing Guidelines

### Frontend Tests

- Test component rendering
- Test user interactions
- Test error states
- Test loading states
- Use React Testing Library best practices

### Backend Tests

- Test API endpoints
- Test validation logic
- Test error handling
- Test authentication/authorization
- Use Jest and Supertest

### Test Coverage

- Aim for 80%+ coverage on new code
- Critical paths (auth, security) should have higher coverage
- Write tests before or alongside code (TDD when possible)

## Documentation

- Update README.md if adding new features
- Add JSDoc comments for complex functions
- Update API.md for new endpoints
- Keep inline comments concise and meaningful

## Security Considerations

- Never commit secrets or credentials
- Validate all user inputs
- Follow security best practices
- Report security vulnerabilities privately

## Review Process

1. All PRs require at least one approval
2. CI checks must pass (tests, linting)
3. Code review feedback should be addressed
4. Maintainer will merge when ready

## Questions?

- Open an issue for questions
- Check existing documentation first
- Be patient - maintainers are volunteers

Thank you for contributing! 🎉

