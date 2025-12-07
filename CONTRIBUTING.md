# Contributing to AiBoT

First off, thank you for considering contributing to AiBoT! It's people like you that make AiBoT such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples
- Describe the behavior you observed and what you expected
- Include screenshots if applicable
- Include your environment details (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- Use a clear and descriptive title
- Provide a detailed description of the suggested enhancement
- Explain why this enhancement would be useful
- List any alternative solutions you've considered

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/AiBoT.git
cd AiBoT

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Add your OPENROUTER_API_KEY

# Start development server
pnpm run dev
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (we use Prettier)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Component Guidelines

- Use functional components with hooks
- Memoize expensive computations
- Keep components small and reusable
- Use proper TypeScript types (no `any`)
- Follow the existing folder structure

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests after the first line

Example:

```
Add user authentication feature

- Implement login/logout functionality
- Add JWT token management
- Create protected routes

Closes #123
```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good code coverage

## Project Structure

```
AiBoT/
├── app/                    # Next.js app directory
│   ├── (app)/             # App routes
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── chat/             # Chat-specific components
│   ├── ui/               # Reusable UI components
│   └── ai-elements/      # AI-specific elements
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and types
└── styles/               # Global styles
```

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉
