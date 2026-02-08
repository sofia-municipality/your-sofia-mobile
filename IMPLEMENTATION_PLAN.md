# Your Sofia - Implementation Plan (draft)

## Project Overview

**Your Sofia** is an open-source civic engagement platform for Sofia residents, consisting of:

- **Mobile App** (React Native/Expo): Citizen-facing application for reporting issues, viewing news, and navigating city services
- **API Backend** (Payload CMS/Next.js): Content management and data services

### Core Mission

Creating a better living environment through active interaction between citizens and administration via:

- 📰 Informing citizens through news, notifications, and location-based updates
- 🗺️ Caring for urban environment through signal reporting and city object mapping
- ⚙️ Efficient city administration through internal interfaces for signal processing and work assignments

---

## Epic Features

### 1. News & Notifications System

**Repository**: `your-sofia-mobile`  
**Priority**: High  
**Status**: In Progress

#### Purpose

Provide citizens with timely, relevant information about city events, infrastructure changes, and emergencies through rich media content and push notifications.

#### Tasks

- [ ] **Fix RichText Display** - Ensure proper rendering of formatted news content
- [ ] **What's New Splash Screen** - Onboarding for new users and update announcements
- [ ] **Push Notifications Integration** - Enable real-time alerts for citizens
- [ ] **Bell Icon Modal Summary** - Notification center with unread count and history

#### Technical Considerations

- Use `expo-notifications` for cross-platform push notifications
- Implement local storage for offline notification access
- Image caching for performance optimization
- Rich text rendering with proper sanitization

#### Acceptance Criteria

- News articles display properly formatted content
- Images show timestamp and location metadata
- First-time users see What's New screen
- Push notifications work on iOS and Android
- Notification center accessible via bell icon

---

### 2. Interactive Map System

**Repository**: `your-sofia-mobile`  
**Priority**: High  
**Status**: In Progress

#### Purpose

Enable citizens to navigate city infrastructure, view waste containers, air quality stations, and add new city objects.

#### Tasks

- [ ] **Expandable + Icon** - Allow users to initiate adding new city objects
- [ ] **Object Type Selection Dialog** - UI for choosing what type of object to add
- [ ] **Performance Optimization** - Handle 1000+ markers efficiently

#### Technical Considerations

- Use `react-native-maps` with marker clustering
- Implement debouncing for map interactions
- Consider marker virtualization for large datasets
- Geospatial indexing on backend

#### Acceptance Criteria

- Users can tap + icon to add new objects
- Object type selection is intuitive
- Map performs smoothly with many markers
- Consistent behavior across iOS and Android

---

### 3. Waste Container Management

**Repository**: `your-sofia-mobile` (primary), `your-sofia-api` (backend)  
**Priority**: High  
**Status**: In Progress

#### Purpose

Comprehensive CRUD system for waste containers allowing citizens to report, view status, and navigate to containers.

#### Tasks (Mobile)

- [ ] **Add New Container Form** - Complete CRUD form for container creation
- [ ] **Google Maps Navigation** - "Navigate To" button opening Google Maps with directions
- [ ] **Adjust Location** - Allow precise container location adjustment on map

#### Tasks (Backend)

- [ ] **Transform Location to PayloadCMS Point** - Migrate location data structure
- [ ] **Admin UI Map Integration** - Add map interface in admin panel
- [ ] **Adjust Point on Map** - Enable location editing in admin UI
- [ ] **Versioning System** - Implement object versioning (requires custom migration)
- [ ] **Pending Approval State** - New containers start in pending state requiring review

#### Technical Considerations

- Use `expo-location` for geolocation
- Implement `react-native-image-picker` for photos
- Google Maps deep linking for navigation
- Form validation and error handling
- PostgreSQL with PostGIS for geospatial data
- Payload CMS version/draft system customization

#### Acceptance Criteria

- Users can add/edit containers with complete information
- Navigation opens Google Maps with directions
- Container location adjustable on map
- Admin approval workflow for new containers
- All container metadata visible on card

---

### 4. Multi-Type City Objects System

**Repository**: `your-sofia-api` (primary), `your-sofia-mobile` (UI)  
**Priority**: High  
**Status**: Not Started

#### Purpose

Enable creation and management of various city object types beyond waste containers, allowing the platform to track diverse urban infrastructure such as benches, playgrounds, bike racks, public toilets, water fountains, and other city amenities.

#### Tasks

##### Backend Refactoring

- [ ] **Abstract Base Object Model** - Create generic city object schema with shared fields
- [ ] **Object Type System** - Define enumeration/taxonomy for different object types
- [ ] **Type-Specific Fields** - Implement polymorphic fields based on object type
- [ ] **Migration Strategy** - Plan and execute migration of existing containers to new system
- [ ] **API Endpoints** - Refactor endpoints to support multiple object types
- [ ] **Admin UI Updates** - Update Payload CMS collections for object type management

##### Mobile App Updates

- [ ] **Object Type Selection** - UI for choosing object type when adding new objects
- [ ] **Type-Specific Forms** - Dynamic forms based on selected object type
- [ ] **Map Markers** - Different icons/colors for different object types
- [ ] **Filtering by Type** - Allow users to filter map view by object type
- [ ] **Object Type Cards** - Tailored detail views for different object types

#### Technical Considerations

- Database schema design for polymorphic objects (single table vs. table-per-type)
- Backward compatibility with existing container data
- Type registry system for extensibility
- Validation rules per object type
- Icon library for different object types
- Performance impact of filtering with multiple types
- Admin interface for adding new object types without code changes

#### Acceptance Criteria

- System supports at least 5 different object types (containers, benches, playgrounds, bike racks, water fountains)
- Existing container data migrates without loss
- Users can add any supported object type via mobile app
- Map displays different icons for different object types
- Filtering by object type works seamlessly
- Admin can configure new object types through UI
- API maintains backward compatibility

---

### 5. Signal Reporting System

**Repository**: `your-sofia-mobile` (primary), `your-sofia-api` (backend)  
**Priority**: High  
**Status**: In Progress

#### Purpose

Enable citizens to report urban environment issues with photos and metadata, creating actionable signals for city services.

#### Tasks (Mobile)

- [ ] **Images with Visual Timestamp and Location** - Display contextual information on signal images
- [ ] **Filter: My Signals vs All Signals** - Allow users to toggle between their reports and all reports
- [ ] **Reorder Bulk Upload Form** - Request properties before photo selection for better UX

#### Tasks (Backend)

- [ ] **Remove Localization** - Simplify signal structure by removing confusing localization
- [ ] **Anonymous User Restrictions**:
  - [ ] Distance restriction: Prevent signals for objects >20m away
  - [ ] Rate limiting: Maximum 5 signals per day for anonymous users

#### Related Features

- [ ] **Link to Assignment System** - Signalled objects feed into "Batman assignment" workflow

#### Technical Considerations

- Implement geospatial distance validation
- Rate limiting with Redis or similar
- State management for filters (React Context/Redux)
- Optimistic UI updates
- Clear error messaging for restrictions

#### Acceptance Criteria

- Users can filter between personal and all signals
- Bulk upload asks for metadata first
- Anonymous users respect distance and rate limits
- Signal lifecycle clearly communicated
- Signals appear in assignment system

---

### 6. Assignment & Work Management

**Repository**: `your-sofia-mobile`  
**Priority**: Medium  
**Status**: Not Started

#### Purpose

Create a work assignment system for city operators and inspectors to manage waste collection and maintenance based on citizen signals.

#### Tasks

- [ ] **Smart Container Selection** - Algorithm to select most signaled containers for collection
- [ ] **Filters**: Container type, work type, location
- [ ] **Role System**: Operators and Inspectors roles
- [ ] **Assignment Interface** - Supervisors can assign work to operators
- [ ] **Assignment Status** - Mark containers as assigned to prevent duplicates
- [ ] **Pending Reviews Form** - Inspectors review completed work
- [ ] **Completion Workflow** - Operators mark work as complete with photos
- [ ] **Assignment History** - Audit trail and analytics

#### Technical Considerations

- Role-based access control (RBAC)
- Efficient database queries for signal aggregation
- Push notifications for new assignments
- Offline-first architecture for field work
- Photo capture for work verification

#### Acceptance Criteria

- System suggests containers by signal count
- Multi-criteria filtering works
- Operators see only their assignments
- Inspectors can review completed work
- No duplicate assignments
- Complete audit trail maintained

---

### 7. User Management & Roles

**Repository**: `your-sofia-api` (primary), `your-sofia-mobile` (UI)  
**Priority**: Medium  
**Status**: Not Started

#### Purpose

Implement role-based access control system to enable proper permissions for different user types and ensure data quality through anonymous user restrictions.

#### Tasks

##### Roles & Permissions

- [ ] **Inspector Role** - Define permissions for quality control personnel
- [ ] **Operator Role** - Define permissions for field workers
- [ ] **Role Assignment Interface** - Admin UI for role management
- [ ] **API Middleware** - Role-based access control enforcement
- [ ] **Payload CMS Access Control** - Update collection-level permissions

##### Anonymous User Restrictions

- [ ] **Distance Restriction** - Prevent signals for objects >20m away (anonymous users)
- [ ] **Rate Limiting** - Maximum 5 signals per day for anonymous users
- [ ] **Rate Limiting Middleware** - Implement tracking and enforcement
- [ ] **Clear Error Messages** - User-friendly feedback for restrictions

#### Technical Considerations

- Payload CMS built-in access control
- Geospatial queries for distance validation
- Redis for rate limiting
- JWT token role claims
- Clear permission documentation

#### Acceptance Criteria

- Inspector and Operator roles function with appropriate permissions
- Anonymous users have clear limitations enforced
- Registered users have appropriate access levels
- Rate limiting works reliably
- Distance validation accurate

---

### 8. DevOps & Infrastructure

**Repository**: Both  
**Priority**: Medium  
**Status**: In Progress

#### Purpose

Automate deployment, improve developer experience, and ensure production readiness.

#### Tasks

- [ ] **Expo GitHub Integration** - Auto-build and publish on releases
- [ ] **Apple Registration** - Complete App Store setup
- [ ] **Kubernetes Implementation** - Container orchestration for production
- [ ] **Email Server Configuration** - Transactional emails for notifications
- [ ] **Simplify Issue Creation** - Templates and automation
- [ ] **Add Agent Skills** - Expo, Next.js, React Native skills for AI assistance
- [ ] **AI-Guided Refactoring** - Apply AI agent recommendations

#### Technical Considerations

- EAS (Expo Application Services) for builds
- GitHub Actions workflows
- Kubernetes manifests and Helm charts
- Email service provider (SendGrid, AWS SES, etc.)
- Issue templates for GitHub

#### Acceptance Criteria

- Mobile app builds automatically on release
- App Store and Play Store submission ready
- Production deployment automated
- Email notifications functional
- Contributor experience improved

---

### 9. Testing & Quality Assurance

**Repository**: Both  
**Priority**: Medium  
**Status**: Minimal Coverage

#### Purpose

Ensure reliability, catch regressions, and maintain code quality through comprehensive testing.

#### Tasks

##### Backend Tests (`your-sofia-api`)

- [ ] **Unit Tests** - Core business logic (signals, containers, users)
- [ ] **Integration Tests** - API endpoints with database
- [ ] **Authentication Tests** - Role-based access control
- [ ] **Geospatial Tests** - Distance calculations and queries

##### Frontend Tests (`your-sofia-mobile`)

- [ ] **Unit Tests** - React components and hooks
- [ ] **Integration Tests** - User flows (create signal, view containers)
- [ ] **E2E Tests** - Critical paths with Detox or similar
- [ ] **Snapshot Tests** - UI consistency

#### Technical Considerations

- Jest for unit and integration tests
- React Native Testing Library
- Detox for E2E testing
- Test databases with seed data
- CI/CD integration

#### Acceptance Criteria

- > 80% code coverage for core functionality
- All critical user flows tested
- Tests run automatically in CI/CD
- Clear testing documentation

---

## Implementation Priority Matrix

### Phase 1: MVP Enhancement (Immediate)

1. News & Notifications - Complete push notifications and rich text
2. Container Management - Finish CRUD forms and navigation
3. Signal System - Add filtering and backend restrictions
4. Multi-Type City Objects - Refactor to support various object types
5. Backend - Location migration to PayloadCMS Point

### Phase 2: Work Management (Next)

6. Assignment System - Build complete workflow
7. User Roles - Inspector and Operator permissions
8. Map Enhancements - Object addition flow

### Phase 3: Engagement & Scale (Future)

9. DevOps - Kubernetes and automation
10. Testing - Comprehensive coverage

---

## Dependencies & Blockers

### Critical Dependencies

- **Multi-Type City Objects Refactoring** (Backend) → Blocks adding non-container objects
- **Container Location Migration** (Backend) → Blocks map editing features
- **Role System** (Backend) → Blocks assignment system
- **Anonymous User Restrictions** (Backend) → Prevents spam signals

### External Dependencies

- Apple Developer Program enrollment
- Email service provider selection
- Kubernetes cluster setup

---

## Contributor Guidelines

### Getting Started

1. Review relevant README files in each repository
2. Check existing issues for the feature you want to work on
3. Comment on the issue to claim it
4. Follow contribution guidelines in CONTRIBUTING.md

### Code Standards

- TypeScript for type safety
- ESLint and Prettier for code formatting
- Meaningful commit messages
- Tests for new features
- Bilingual support (Bulgarian/English)

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit PR with clear description
5. Address review feedback

---

## Questions or Suggestions?

Open an issue in the respective repository or join our community discussions!

**Repository Links:**

- Mobile: https://github.com/sofia-municipality/your-sofia-mobile
- API: https://github.com/sofia-municipality/your-sofia-api
