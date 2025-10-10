# GitHub Templates Guide for Your Sofia

This document provides an overview of the GitHub issue and PR templates for maintainers and contributors.

## 📁 Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── config.yml                 # Issue template configuration
│   ├── bug_report.yml            # 🐛 Bug reports
│   ├── feature_request.yml       # 💡 Feature requests
│   ├── documentation.yml         # 📖 Documentation improvements
│   ├── translation.yml           # 🌍 Translation issues
│   ├── question.yml              # ❓ Questions
│   ├── performance.yml           # ⚡ Performance issues
│   ├── security.yml              # 🔒 Security vulnerabilities
│   └── README.md                 # Templates documentation
├── PULL_REQUEST_TEMPLATE.md      # PR template
└── copilot-instructions.md       # AI assistant context
```

## 🎯 Template Overview

### Issue Templates (7 types)

| Template | Purpose | When to Use |
|----------|---------|-------------|
| **Bug Report** | Report bugs and unexpected behavior | App crashes, errors, features not working |
| **Feature Request** | Suggest new features or enhancements | New functionality, improvements, user needs |
| **Documentation** | Improve docs, guides, or examples | Missing info, unclear sections, typos |
| **Translation** | Report translation issues | Missing, incorrect, or awkward translations |
| **Question** | Ask usage or contribution questions | Setup help, how-to questions |
| **Performance** | Report performance issues | Slow loading, memory leaks, optimization needs |
| **Security** | Report low-severity security concerns | Non-critical vulnerabilities, best practices |

### Pull Request Template

Comprehensive PR template covering:
- Description and type of change
- Testing checklist (iOS/Android/Backend)
- Code quality standards
- Localization requirements (Bulgarian + English)
- Breaking changes documentation
- Security considerations
- Deployment notes

## 🚀 Quick Start for Contributors

### Reporting an Issue

1. Go to [Issues](https://github.com/sofia-municipality/your-sofia/issues/new/choose)
2. Choose the appropriate template
3. Fill out all required fields
4. Submit the issue

### Creating a Pull Request

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Push to your fork
5. Open a PR (template auto-loads)
6. Fill out all sections
7. Request review

## 📋 Template Features

### All Templates Include

✅ **Structured input** - Form-based with dropdowns and text areas  
✅ **Required fields** - Ensures essential information is provided  
✅ **Clear instructions** - Markdown explanations for each section  
✅ **Examples** - Placeholder text showing what to provide  
✅ **Labels** - Auto-applied labels for organization  
✅ **Validation** - Required field enforcement  

### Special Features

#### Bug Report
- Platform selection (iOS/Android/Both)
- Device and OS information
- Error log rendering (code block formatting)
- Screenshot upload support

#### Feature Request
- Problem-solution framework
- User benefit analysis
- Implementation notes section
- Priority/impact assessment
- Mockup attachment support

#### Translation
- Language-specific (Bulgarian/English)
- Translation key tracking
- Context explanation
- Both-languages checkbox

#### Performance
- Performance measurement fields
- Profiling data support
- Optimization suggestion section
- Platform-specific testing

#### Security
- Severity confirmation (critical → private reporting)
- Responsible disclosure agreement
- Impact assessment
- Fix recommendation section

## 🏷️ Label System

### Auto-Applied Labels

Each template automatically applies initial labels:

- Bug Report → `bug`, `needs-triage`
- Feature Request → `enhancement`, `needs-triage`
- Documentation → `documentation`, `needs-triage`
- Translation → `translation`, `i18n`, `needs-triage`
- Question → `question`, `needs-triage`
- Performance → `performance`, `needs-triage`
- Security → `security`, `needs-triage`

### Additional Labels (Manual)

Maintainers should add:

**Priority:**
- `priority: critical`
- `priority: high`
- `priority: medium`
- `priority: low`

**Component:**
- `frontend` - Mobile app
- `backend` - API/CMS
- `database` - Database-related
- `infrastructure` - DevOps/deployment

**Status:**
- `good first issue` - For newcomers
- `help wanted` - Extra attention needed
- `in progress` - Being worked on
- `blocked` - Blocked by another issue
- `wontfix` - Will not work on

## 🔄 Workflow Integration

### Issue Lifecycle

```
New Issue (template filled)
    ↓
Needs Triage (auto-labeled)
    ↓
Maintainer Review
    ↓
├─→ Accepted (add priority, component labels)
├─→ Needs Info (request clarification)
├─→ Duplicate (close, link to original)
└─→ Wontfix (explain and close)
    ↓
Accepted Issue
    ↓
├─→ Assigned (someone working)
└─→ Help Wanted (community contribution)
    ↓
PR Created
    ↓
Code Review
    ↓
Merged & Closed
```

### PR Lifecycle

```
PR Created (template filled)
    ↓
CI Checks Run
    ↓
├─→ Checks Pass → Ready for Review
└─→ Checks Fail → Fix Required
    ↓
Code Review
    ↓
├─→ Approved → Merge
├─→ Changes Requested → Update PR
└─→ Commented → Discuss
    ↓
Merged
    ↓
Issue Auto-Closed (if linked with "Closes #")
```

## 👥 For Maintainers

### Triaging New Issues

**Check for:**
1. ✅ Template properly filled out
2. ✅ All required information provided
3. ✅ Not a duplicate
4. ✅ Using correct template
5. ✅ Follows code of conduct

**Actions:**
1. **Add labels** - Priority, component, status
2. **Request info** - If incomplete
3. **Link issues** - Connect related issues
4. **Assign** - If ready for work
5. **Comment** - Acknowledge and provide context

### Reviewing Pull Requests

**Focus areas:**
- [ ] Code quality and style
- [ ] Test coverage
- [ ] Documentation updates
- [ ] Both Bulgarian and English translations
- [ ] No breaking changes (or properly documented)
- [ ] Performance implications
- [ ] Security considerations

**Review checklist:**
1. Read PR description thoroughly
2. Check linked issue for context
3. Review code changes
4. Test locally if significant
5. Check CI results
6. Leave constructive feedback
7. Approve or request changes

### Template Maintenance

**Regular reviews:**
- Monthly: Check if templates need updates
- After major releases: Update examples
- When patterns emerge: Add new templates or fields
- User feedback: Improve unclear sections

**Update triggers:**
- New project features → Update feature request template
- Common missing info → Add required fields
- New tech stack → Update testing checklist
- Community feedback → Clarify instructions

## 📊 Analytics & Improvement

### Track Metrics

Monitor:
- Issue template usage (which templates most used?)
- Incomplete issues (which fields often skipped?)
- Time to triage (how long until labeled?)
- Duplicate issues (template not preventing duplicates?)
- Contributor satisfaction (feedback on template clarity)

### Continuous Improvement

**Good signs:**
- Issues have all needed information
- Few follow-up questions needed
- Quick triage and assignment
- Community feels supported

**Warning signs:**
- Many incomplete issues
- Frequent "needs more info" comments
- Template fields often skipped
- Contributors confused by templates

**Action items:**
- Simplify complex templates
- Add more examples
- Clarify confusing sections
- Remove unused fields
- Add missing fields based on patterns

## 🌍 Localization Considerations

### Bilingual Project

Your Sofia is Bulgarian-first:
- All templates are in English (GitHub standard)
- Issues can be written in Bulgarian or English
- Maintainers should respond in the reporter's language
- Translation template helps coordinate Bulgarian/English content

### Translation Workflow

1. **Translation Issue Created** → Identifies missing/wrong translations
2. **Contributor Submits PR** → Updates both bg.ts and en.ts
3. **Review Checks** → Both languages updated, culturally appropriate
4. **Merged** → App now has correct translations

## 🔒 Security Best Practices

### Public vs Private Reporting

**Public (use Security template):**
- Configuration improvements
- Best practice suggestions
- Low-severity issues
- Dependency updates

**Private (email security@your-sofia.bg):**
- Critical vulnerabilities
- Data exposure risks
- Authentication bypasses
- Privilege escalation
- Any immediate security threat

### Security Template Safeguards

- Severity confirmation required
- Warns against public disclosure
- Links to private reporting
- Responsible disclosure agreement

## 📚 Resources

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full contribution guide
- [README.md](../README.md) - Project documentation
- [Code of Conduct](../CONTRIBUTING.md#code-of-conduct) - Community standards
- [GitHub Discussions](https://github.com/sofia-municipality/your-sofia/discussions) - Community forum

## 💡 Tips for Success

**For Contributors:**
1. Use the right template
2. Fill out all required fields
3. Provide clear reproduction steps
4. Attach screenshots/videos
5. Be patient and respectful

**For Maintainers:**
1. Respond promptly (within 3-5 days)
2. Be welcoming to new contributors
3. Provide constructive feedback
4. Acknowledge good work
5. Keep issues organized with labels

**For Both:**
1. Search before creating issues
2. Keep discussions focused
3. Follow code of conduct
4. Celebrate contributions
5. Help others learn

---

## 🎉 Making Templates Work

Good templates lead to:
- ✅ Better bug reports → Faster fixes
- ✅ Clearer feature requests → Better prioritization  
- ✅ Complete information → Less back-and-forth
- ✅ Organized issues → Easier maintenance
- ✅ Welcoming process → More contributors

**Remember:** Templates are tools, not barriers. They help both contributors provide good information and maintainers understand issues quickly. Keep them simple, clear, and useful! 🚀

---

*Last updated: October 2025*