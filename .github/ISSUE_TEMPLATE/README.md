# GitHub Issue Templates

This directory contains issue templates for the **Your Sofia** project. These templates help contributors provide consistent, detailed information when reporting bugs, requesting features, or asking questions.

## Available Templates

### 🐛 Bug Report (`bug_report.yml`)
Use this template to report bugs or unexpected behavior in the app or backend.

**When to use:**
- App crashes or freezes
- Features not working as expected
- Error messages or exceptions
- UI rendering issues
- Data not loading correctly

**Includes:**
- Component selection (frontend/backend/both)
- Step-by-step reproduction guide
- Platform and device information
- Error logs and screenshots
- Severity assessment

---

### 💡 Feature Request (`feature_request.yml`)
Use this template to suggest new features or enhancements.

**When to use:**
- Proposing new functionality
- Suggesting UX improvements
- Requesting new API endpoints
- Adding civic engagement features
- Enhancing existing features

**Includes:**
- Problem statement (what need does this address?)
- Proposed solution
- Alternative approaches considered
- User benefit analysis
- Implementation notes (technical considerations)
- Mockups/examples

---

### 📖 Documentation Improvement (`documentation.yml`)
Use this template to report issues with documentation or suggest improvements.

**When to use:**
- Missing documentation
- Outdated instructions
- Unclear explanations
- Typos or grammar errors
- Broken links
- Missing examples

**Includes:**
- Documentation area (README, Contributing, API docs, etc.)
- Type of issue (missing, incorrect, unclear, etc.)
- Current documentation state
- Suggested improvements
- Language selection (Bulgarian/English)

---

### 🌍 Translation Issue (`translation.yml`)
Use this template to report missing or incorrect translations.

**When to use:**
- Missing translations (untranslated text)
- Incorrect translations (wrong meaning)
- Awkward or unclear phrasing
- Cultural context issues
- Grammar or spelling errors
- Inconsistent terminology

**Includes:**
- Translation type (missing, incorrect, unclear, etc.)
- Language (Bulgarian/English)
- Location in app
- Current text
- Suggested translation
- Context and reasoning

---

### ❓ Question (`question.yml`)
Use this template to ask questions about using or contributing to the project.

**When to use:**
- Setup or installation questions
- How to contribute questions
- Usage questions
- Architecture questions
- Deployment questions

**Note:** For general discussions or feature brainstorming, use [GitHub Discussions](https://github.com/sofia-municipality/your-sofia/discussions) instead.

**Includes:**
- Question category
- What you've already tried
- Environment details
- Error messages (if applicable)

---

### ⚡ Performance Issue (`performance.yml`)
Use this template to report performance problems or suggest optimizations.

**When to use:**
- Slow loading times
- High memory usage
- Memory leaks
- Battery drain
- Network inefficiency
- App freezing or hanging
- Slow database queries

**Includes:**
- Affected component
- Performance issue type
- Expected vs actual performance
- Measurements and profiling data
- Suggested optimizations

---

### 🔒 Security Vulnerability (`security.yml`)
Use this template for **low-severity** security concerns only.

**⚠️ IMPORTANT:** For critical security vulnerabilities, **DO NOT** create a public issue. Report privately to: itsecurity@sofia.bg

**When to use:**
- Low-severity security improvements
- Configuration best practices
- Non-critical dependency vulnerabilities
- Information disclosure (non-sensitive)
- Rate limiting suggestions

**Includes:**
- Severity confirmation
- Security category
- Potential impact
- Recommended fix
- Responsible disclosure agreement

---

## Issue Labels

Our issues use the following labels for organization:

### Type Labels
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `translation` - Translation/i18n issues
- `question` - Questions about usage or contribution
- `performance` - Performance improvements
- `security` - Security-related issues

### Status Labels
- `needs-triage` - Needs review by maintainers
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `in progress` - Someone is working on it
- `blocked` - Blocked by another issue
- `wontfix` - Will not be worked on

### Priority Labels
- `priority: critical` - Must be fixed immediately
- `priority: high` - Should be fixed soon
- `priority: medium` - Normal priority
- `priority: low` - Nice to have

### Component Labels
- `frontend` - Mobile app (React Native)
- `backend` - API/CMS (Payload)
- `database` - Database-related
- `infrastructure` - Deployment/DevOps

## Configuration

The `config.yml` file controls issue template behavior:

- **Blank issues disabled** - All issues must use a template
- **Contact links** - Directs users to:
  - GitHub Discussions for general questions
  - Documentation for setup help

## Guidelines for Issue Reporters

### Before Creating an Issue

1. **Search existing issues** - Your issue may already be reported
2. **Check documentation** - The answer might be in README or CONTRIBUTING
3. **Try GitHub Discussions** - For open-ended questions or feature brainstorming
4. **Use the right template** - Choose the template that best fits your issue

### Writing Good Issues

**Do:**
- ✅ Use descriptive titles
- ✅ Provide complete information
- ✅ Include reproduction steps for bugs
- ✅ Attach screenshots or logs when relevant
- ✅ Be respectful and constructive
- ✅ Follow the template structure

**Don't:**
- ❌ Use vague titles like "It doesn't work"
- ❌ Submit duplicate issues
- ❌ Include multiple unrelated issues in one report
- ❌ Share critical security vulnerabilities publicly
- ❌ Demand immediate fixes

### Issue Lifecycle

1. **Opened** - Issue is created using template
2. **Triaged** - Maintainers review and label
3. **Accepted** - Issue is confirmed and ready for work
4. **In Progress** - Someone is working on it
5. **Review** - PR under review
6. **Closed** - Fixed, resolved, or won't fix

## For Maintainers

### Triaging Issues

When a new issue arrives:

1. **Verify completeness** - Ensure template is properly filled
2. **Add labels** - Type, priority, component
3. **Ask for clarification** - If information is missing
4. **Link related issues** - Connect to existing issues
5. **Assign if ready** - Assign to team member or mark as "good first issue"

### Template Maintenance

- Update templates when patterns emerge
- Add new templates for recurring issue types
- Remove or merge redundant templates
- Keep in sync with project evolution

---

## Contributing

Have suggestions for improving our issue templates? 

- Open an issue using the **Documentation Improvement** template
- Submit a PR with template changes
- Discuss in [GitHub Discussions](https://github.com/sofia-municipality/your-sofia/discussions)

---

**Remember:** Good issue reports lead to faster fixes and better software. Thank you for taking the time to provide detailed information! 🙏