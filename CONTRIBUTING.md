# Contributing to Your Sofia

Thank you for your interest in contributing to **Your Sofia**! This project is built by the community, for the community. Whether you're a developer, designer, translator, or just someone who cares about making Sofia a better place to live, we welcome your contributions.

[🇧🇬 Прочети на български](CONTRIBUTING.bg.md)

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Reporting Issues](#reporting-issues)
- [Submitting Changes](#submitting-changes)
- [Code Review Process](#code-review-process)
- [Community](#community)
- [License](#license)

---

## Code of Conduct

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

## Getting Started

**📦 Monorepo Setup:** Your Sofia consists of two repositories that work together:

- [**your-sofia-mobile**](https://github.com/sofia-municipality/your-sofia-mobile) (this repo) - React Native mobile app
- [**your-sofia-api**](https://github.com/sofia-municipality/your-sofia-api) - Payload CMS backend API

Both repositories need to be cloned and configured for full functionality. The mobile app requires the API to be running locally for development.

### 1. Fork the Repository

Click the "Fork" button on the [GitHub repository](https://github.com/sofia-municipality/your-sofia-mobile).

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/your-sofia-mobile.git
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
```

### 5. Make Your Changes

Write your code following quality and style standards.

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Open a Pull Request

Go to the original repository and click "New Pull Request".

---

## Reporting Issues

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

## Submitting Changes

### Pull Request Guidelines

**Before submitting:**

- ✅ Ensure your code follows our style guidelines
- ✅ Add tests for new features
- ✅ Update documentation if needed
- ✅ Run all tests and ensure they pass
- ✅ Rebase on the latest `main` branch
- ✅ Keep pull requests focused (one feature/fix per PR)

---

## Code Review Process

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

## Community

### Communication Channels

Connect with maintainers on the main Discord channel

### Recognition

We value all contributions! Contributors are:

- Listed in project documentation via AllContributors bot
- Acknowledged in release notes
- Recognized in the community

---

## License

By contributing to Your Sofia, you agree that your contributions will be licensed under the [EUPL-1.2 License](LICENSE).

---

## Thank You!

Your contributions make **Your Sofia** better for everyone. Whether you're fixing a typo or building a major feature, every contribution matters. Together we're building a more transparent, accessible, and livable city.

**Happy contributing!** 🎉

---

**Questions?** Open an issue or discussion—we're here to help!
