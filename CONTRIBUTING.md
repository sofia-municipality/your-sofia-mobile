# Contributing to Your Sofia

Thank you for your interest in contributing to **Your Sofia**! This project is built by the community, for the community. Whether you're a developer, designer, translator, or just someone who cares about making Sofia a better place to live, we welcome your contributions.

[🇧🇬 Прочети на български](CONTRIBUTING.bg.md)

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Reporting Issues](#reporting-issues)
- [Submitting Changes](#submitting-changes)
- [Code Review Process](#code-review-process)
- [Community](#community)
- [License](#license)

---

## 🤝 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for everyone.

### Our Standards

**Positive behaviors:**

- ✅ Using welcoming and inclusive language
- ✅ Being respectful of differing viewpoints and experiences
- ✅ Gracefully accepting constructive criticism
- ✅ Focusing on what is best for the community
- ✅ Showing empathy towards other community members
- ✅ Giving credit where credit is due

**Unacceptable behaviors:**

- ❌ Trolling, insulting/derogatory comments, and personal or political attacks
- ❌ Publishing others' private information without explicit permission
- ❌ Discrimination or exclusion based on any personal characteristic

### Enforcement

Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, issues, and other contributions that do not align with this Code of Conduct.

---

## 🎯 How Can I Contribute?

### 1. 🐛 Reporting Bugs

Use the provided [issue templates](https://github.com/sofia-municipality/your-sofia/issues/new/choose) to report bugs. Include:

- Clear title and steps to reproduce
- Expected vs actual behavior
- Device and OS information
- Screenshots or error messages

### 2. 💡 Suggesting Features

Have an idea? Check [existing issues](https://github.com/sofia-municipality/your-sofia/issues) first. Describe:

- What problem it solves
- Proposed solution
- Benefit for Sofia residents
- Mockups (if applicable)

### 3. 🔧 Contributing Code

We welcome:

- Bug fixes
- New features (after discussion in issues)
- Performance and UI/UX improvements
- Test coverage
- Accessibility enhancements

### 4. 📖 Improving Documentation

- Fix typos and clarify sections
- Add examples and tutorials
- Translate to Bulgarian
- Document new features

### 5. 🌍 Translation and Localization

Help make the app accessible to everyone:

- Translate missing strings (bg/en)
- Improve existing translations
- Report incorrect or unclear wording

---

## 🚀 Getting Started

### 1. Fork the Repository

Click the "Fork" button on the [GitHub repository](https://github.com/sofia-municipality/your-sofia).

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/your-sofia.git
cd your-sofia
```

### 3. Set Up the Development Environment

**Prerequisites:**

- Node.js 18+ and pnpm 10+
- Expo Go app on your mobile device (for quick testing)
- Android Studio (for building Android apks) or Xcode (for iOS builds)

**Setup:**

```bash
# Install dependencies
pnpm install

# Create environment file and edit it according to your setup
cp .env.example .env.local

# Start development server
pnpm dev
```

**Running the app:**

- Scan QR code with Expo Go app for physical device testing

**For Local builds for iOS and Android**
https://docs.expo.dev/guides/local-app-development/

```bash
# Configure Android SDK location (Android only)
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# Build and run in emulator
pnpm android
pnpm ios
```

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**

- `feature/` - New features (e.g., `feature/air-quality-alerts`)
- `fix/` - Bug fixes (e.g., `fix/news-refresh-language`)
- `docs/` - Documentation (e.g., `docs/api-endpoints`)
- `refactor/` - Code refactoring (e.g., `refactor/api-client`)
- `test/` - Adding tests (e.g., `test/news-component`)

### 5. Make Your Changes

Write your code following quality and style standards.

### 6. Test Your Changes

```bash
# Frontend tests
cd app
pnpm typecheck
pnpm lint
pnpm test

# Backend tests
cd api
pnpm lint
pnpm typecheck
```

### 7. Commit Your Changes

Write clear, descriptive commit messages in English, example:

```bash
git add .
git commit -m "added: air quality notifications

- Added user setting for air quality threshold in profile settings
- Implemented backend scheduled task to check air quality
- Send push notifications when threshold exceeded
- Added Bulgarian and English translations

Closes #123"
```

**Types:**

- `added:` - New functionality
- `fixed:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic changes)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process, dependencies, etc.

### 8. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 9. Open a Pull Request

Go to the original repository and click "New Pull Request".

---

## 📝 Reporting Issues

### Writing Good Issues

**Do:**

- ✅ Use descriptive titles
- ✅ Provide context and background
- ✅ Include specific details
- ✅ Attach screenshots or code snippets
- ✅ Search existing issues first

**Don't:**

- ❌ Don't use vague titles like "Not working"
- ❌ Don't submit duplicate issues
- ❌ Don't include multiple unrelated problems in one report
- ❌ Don't demand immediate fixes

---

## 🔄 Submitting Changes

### Pull Request Guidelines

**Before submitting:**

- ✅ Ensure your code follows our style guidelines
- ✅ Add tests for new features
- ✅ Update documentation if needed
- ✅ Run all tests and ensure they pass
- ✅ Rebase on the latest `main` branch
- ✅ Keep pull requests focused (one feature/fix per PR)

---

## 👀 Code Review Process

### For Contributors

**After submitting a PR:**

1. Maintainers will review within a few days
2. Respond to feedback or requested changes
3. Update your PR by pushing new commits
4. Request re-review when ready

**Responding to feedback:**

- Be open to suggestions
- Ask questions if something is unclear
- Don't take criticism personally
- Explain your reasoning if you disagree

### For Reviewers

**What to look for:**

- Code quality and style
- Test coverage
- Documentation updates
- Performance implications
- Security considerations
- Accessibility
- Localization (both Bulgarian and English)

**Review etiquette:**

- Be respectful and constructive
- Explain _why_ changes are needed
- Acknowledge good work
- Suggest improvements, don't demand them
- Approve quickly when appropriate

**Review checklist:**

- [ ] Code is clear and maintainable
- [ ] Tests cover the changes
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Follows project conventions
- [ ] Both Bulgarian and English translations present
- [ ] Works on iOS and Android (if frontend)
- [ ] No performance regressions

---

## 🤝 Community

### Communication Channels

Connect with maintainers on the main Discord channel

### Recognition

We value all contributions! Contributors are:

- Listed in project documentation via AllContributors bot
- Acknowledged in release notes
- Recognized in the community

---

## 📜 License

By contributing to Your Sofia, you agree that your contributions will be licensed under the [EUPL-1.2 License](LICENSE).

---

## 🙏 Thank You!

Your contributions make **Your Sofia** better for everyone. Whether you're fixing a typo or building a major feature, every contribution matters. Together we're building a more transparent, accessible, and livable city.

**Happy contributing!** 🎉

---

**Questions?** Open an issue or discussion—we're here to help!
