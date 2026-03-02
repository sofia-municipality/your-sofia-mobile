# Your Sofia Mobile - AI Agent Instructions

## Important Instructions

**Do not generate summaries of completed work.** The user can see changes in the diff/file changes. Only provide summaries if explicitly requested.

## Repository Skills

This repository includes curated skill documents under `.agents/skills/` that provide domain-specific expertise for mobile development with Expo and React Native. Before implementing features or proposing changes, consult the relevant skill documentation to ensure you follow established patterns.

### Available Skills

The following skills are available in this repository:

1. **building-native-ui** - `.agents/skills/building-native-ui/` - Complete guide for building beautiful apps with Expo Router, styling, components, navigation, animations, and native tabs
2. **expo-api-routes** - `.agents/skills/expo-api-routes/` - API routes patterns for Expo applications
3. **expo-cicd-workflows** - `.agents/skills/expo-cicd-workflows/` - CI/CD workflow configurations for Expo apps
4. **expo-deployment** - `.agents/skills/expo-deployment/` - Deployment strategies for App Store and Play Store
5. **expo-dev-client** - `.agents/skills/expo-dev-client/` - Development client configuration and usage
6. **expo-tailwind-setup** - `.agents/skills/expo-tailwind-setup/` - Tailwind CSS setup patterns for Expo (if applicable)
7. **native-data-fetching** - `.agents/skills/native-data-fetching/` - Data fetching patterns for React Native apps
8. **upgrading-expo** - `.agents/skills/upgrading-expo/` - Expo upgrade guides and migration strategies
9. **use-dom** - `.agents/skills/use-dom/` - DOM usage patterns in React Native contexts
10. **vercel-composition-patterns** - `.agents/skills/vercel-composition-patterns/` - Composition patterns (for Next.js/backend integration)
11. **vercel-react-best-practices** - `.agents/skills/vercel-react-best-practices/` - React best practices
12. **vercel-react-native-skills** - `.agents/skills/vercel-react-native-skills/` - React Native specific patterns and best practices

**Before implementing features, consult the appropriate skill file (e.g., `building-native-ui/SKILL.md`) for idiomatic patterns and examples.**

## Project Overview

A bilingual (Bulgarian/English) React Native mobile app for Sofia city services, built with Expo. The app provides city services, news, air quality monitoring, and payment features for Sofia residents.

**Sister Repository**: [your-sofia-api](https://github.com/sofia-municipality/your-sofia-api) - Payload CMS backend

## Architecture

### Tech Stack

- **Framework**: Expo 54 with React Native 0.81.4 and React 19.1.0
- **Routing**: Expo Router (file-based routing)
- **Language**: TypeScript
- **Internationalization**: i18next with AsyncStorage persistence
- **Icons**: Lucide React Native
- **Maps**: React Native Maps
- **State**: React hooks, AsyncStorage for persistence
- **Styling**: StyleSheet API (no styled-components or Tailwind)

### Backend Integration

- **API**: Payload CMS 3.0 (separate repository: your-sofia-api)
- **Database**: PostgreSQL with PostGIS for geolocation features

## Critical Workflows

### Development Commands

```bash
# Mobile app
pnpm dev                    # Start Expo (disables telemetry via EXPO_NO_TELEMETRY=1)
pnpm typecheck             # Run TypeScript checks
pnpm lint                  # Run Expo linting
```

### Environment Setup

- Required env vars in `.env.local`: `EXPO_PUBLIC_API_URL` (http://localhost:3000)
- Uses `127.0.0.1` NOT `localhost` for better React Native compatibility (except API URL)
- Backend must be running (see your-sofia-api repository)

## Project-Specific Conventions

### Internationalization (i18n)

**Bulgarian is the default language**, not English. Translation keys follow domain-based namespaces:

- Default namespace: `translations/{bg,en}.ts` - Common UI strings
- Services namespace: `translations/services.{bg,en}.ts` - Service-specific content
- Access via `useTranslation()` hook: `const {t} = useTranslation();` or `const {t: t_services} = useTranslation('services');`
- Language persists in AsyncStorage (`user-language` key)
- See `i18n.ts` for custom language detector implementation

**CRITICAL: Always use translations for static text**

- ❌ NEVER hardcode text directly in components: `<Text>Здравей</Text>`
- ✅ ALWAYS use translation keys: `<Text>{t('common.hello')}</Text>`
- Add new translation keys to BOTH `bg.ts` AND `en.ts` files
- **Bulgarian text is the source of truth** - add it first, then translate to English
- **Always use "Твоята София" when referencing "Your Sofia" in Bulgarian text**
- This applies to ALL user-facing text: buttons, labels, messages, notifications, etc.

### Routing (Expo Router)

File-based routing in `app/` directory:

- Tabs: `(tabs)/_layout.tsx` defines bottom navigation (Home, Services, Payments, Profile)
- Tab screens: `(tabs)/index.tsx`, `(tabs)/services.tsx`, etc.
- Root layout: `_layout.tsx` initializes framework with `useFrameworkReady()` hook
- 404: `+not-found.tsx`

**Consult `.agents/skills/building-native-ui/` for routing patterns and navigation best practices.**

### Payload CMS Integration

- Admin panel: `http://localhost:3000/admin` - Create and manage news content (requires your-sofia-api running)
- API client: `lib/payload.ts` provides `fetchNews()` and `fetchNewsById()`
- News hook: `hooks/useNews.ts` provides `{news, loading, error, refresh}`
- Collections: News (bilingual with location data), Media, Pages, Posts
- Localization: Bulgarian (default) and English support built-in
- PostGIS enabled: Store Point(lat/long) coordinates for news locations

**Consult `.agents/skills/native-data-fetching/` for data fetching patterns.**

### Styling Patterns

- Shared styles: `styles/common.ts` exports `commonStyles` with header/button patterns
- No CSS-in-JS libraries - pure React Native StyleSheet
- Colors: Primary blue `#1E40AF`, text `#1F2937`, borders `#e5e7eb`
- Header pattern: Sofia coat of arms (left) + LanguageSwitch component (right)

**Consult `.agents/skills/building-native-ui/` for styling patterns and component design.**

### Code Formatting

- **CRITICAL**: Always read `.prettierrc` before generating new code
- Follow Prettier configuration:
  - No semicolons (`semi: false`)
  - Single quotes (`singleQuote: true`)
  - 2 space indentation (`tabWidth: 2`)
  - No bracket spacing (`bracketSpacing: false`)
  - ES5 trailing commas (`trailingComma: "es5"`)
  - 100 character line width (`printWidth: 100`)
- All generated code must conform to these formatting rules
- When creating new files, ensure they follow the Prettier configuration
- Run `pnpm format` if unsure about formatting

### Component Patterns

- Icons from `lucide-react-native` (NOT @expo/vector-icons for custom icons)
- Location: `expo-location` for geolocation features
- Maps: `react-native-maps` for map views
- Images: Sofia coat of arms at `assets/images/sofia-gerb.png`
- **Modals**: Always create modals as reusable components in `components/` folder
  - Extract modal logic and UI into standalone components
  - Accept `visible`, `onClose`, and relevant data props
  - Example: `FullScreenPhotoViewer.tsx` instead of inline `<Modal>` usage
  - Promotes reusability and cleaner code organization

### Database Schema (Payload CMS)

- Collections: `news`, `media`, `pages`, `posts`, `users`
- News fields: title, description, content (rich text), topic, image, location, status, publishedAt
- Access control: Only authenticated admins can create/edit, public can read published content
- Hooks: `afterChange` hook on News collection for push notifications

## Integration Points

### News API (Payload CMS)

- REST API: `GET /api/news?locale=bg&where={status:{equals:"published"}}`
- GraphQL: `http://localhost:3000/api/graphql`
- Hook usage: `const {news, loading} = useNews('festivals')`
- Image URLs: Automatically prefixed with API URL

### External Services

- Air quality data: `types/airQuality.ts` defines `AirQualityData` interface
- Maps integration: `components/NewsMap.tsx` displays news on map view

### Cross-Component Communication

- i18n language changes propagate via i18next's change event and trigger news refetch
- News state managed via `useNews` hook with automatic locale switching
- Tab navigation via Expo Router's built-in navigation

## Common Pitfalls

1. **Translation Keys**: Always check both `bg.ts` and `en.ts` - Bulgarian keys are authoritative
2. **Payload Must Be Running**: Backend API (your-sofia-api) must be running before app dev
3. **PostgreSQL Required**: Docker must be running with PostGIS container (in your-sofia-api)
4. **Async Storage**: Used for i18n persistence
5. **Expo Router**: File names matter (`index.tsx` = default route, `+not-found.tsx` = 404)
6. **pnpm Only**: Project uses pnpm 10.18.0, not npm/yarn
7. **API URL**: Use full URL with `http://` in app, not just localhost

## Testing & Debugging

- Payload Admin: http://localhost:3000/admin for content management (your-sofia-api)
- API Explorer: http://localhost:3000/api/news for testing endpoints
- Expo DevTools: Press `m` in terminal to open menu
- TypeScript: Run `pnpm typecheck` - doesn't auto-check on save

## Key Files for Context

- `i18n.ts` - i18n setup with custom AsyncStorage detector
- `lib/payload.ts` - Payload API client for fetching news
- `hooks/useNews.ts` - React hook for news data with locale support
- `app/(tabs)/_layout.tsx` - Tab navigation structure
- Backend: See your-sofia-api repository for News collection schema and Payload configuration

## Using Repository Skills

When working on this project, leverage the available skills based on your task:

- **Building UI**: Review `.agents/skills/building-native-ui/SKILL.md` for comprehensive UI patterns, animations, and navigation
- **Data Fetching**: Check `.agents/skills/native-data-fetching/` for optimal data fetching patterns
- **Deployment**: Use `.agents/skills/expo-deployment/` and `.agents/skills/expo-cicd-workflows/` for deployment strategies
- **Upgrading**: Follow `.agents/skills/upgrading-expo/` when updating Expo versions
- **API Integration**: Consult `.agents/skills/expo-api-routes/` for API patterns
- **React Patterns**: Reference `.agents/skills/vercel-react-best-practices/` and `.agents/skills/vercel-react-native-skills/`

These skills contain comprehensive examples, patterns, and best practices specific to Expo and React Native development. Treat them as authoritative sources for implementation guidance and consult them before proposing architectural changes or new features.
