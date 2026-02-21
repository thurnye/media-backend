# Architecture Documentation
## MEAN + GraphQL Full-Stack Application

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Authentication Flow](#6-authentication-flow)
7. [GraphQL Schema Reference](#7-graphql-schema-reference)
8. [NgRx State Management](#8-ngrx-state-management)
9. [API Communication Pattern](#9-api-communication-pattern)
10. [Security Design](#10-security-design)
11. [Suggested Improvements](#11-suggested-improvements)

---

## 1. Project Overview

This is a full-stack web application built on the **MEAN stack** (MongoDB, Express, Angular, Node.js) with **GraphQL** replacing traditional REST endpoints. It provides user authentication and a post management system (create, read, update, delete) with ownership-based access control.

**Key characteristics:**
- Single GraphQL endpoint (`/graphql`) handles all data operations
- JWT authentication stored in **HttpOnly cookies** (XSS-resistant)
- Reactive Angular frontend using **signals** and **NgRx** for state management
- Clean layered backend: resolvers → services → repositories → models
- Infinite scroll pagination on the post list
- Zod-validated inputs at the service layer; machine-readable error codes in every GraphQL error response
- Optimistic UI updates for create/delete post with automatic rollback on failure

**Monorepo layout:**
```
MEAN-graphql/
├── server/     ← Node.js + Express + Apollo Server (this project)
└── client/     ← Angular 21 SPA
```

---

## 2. Technology Stack

### Backend

| Technology       | Version    | Purpose                                      |
|------------------|------------|----------------------------------------------|
| Node.js          | LTS        | JavaScript runtime                           |
| TypeScript       | ^5.9.3     | Static typing across the entire backend      |
| Express          | ^4.18.2    | HTTP server and middleware orchestration     |
| Apollo Server    | ^4.13.0    | GraphQL server layer                         |
| GraphQL          | ^16.12.0   | Query language and execution engine          |
| Mongoose         | ^8.2.1     | MongoDB ODM with schema validation           |
| MongoDB          | Local/Cloud| Primary NoSQL data store                     |
| Zod              | ^4.x       | Runtime input validation with typed schemas  |
| jsonwebtoken     | ^9.0.2     | JWT generation and verification              |
| bcryptjs         | ^3.0.3     | Password hashing (salt rounds = 10)          |
| cookie-parser    | ^1.4.7     | Parses HttpOnly cookies from requests        |
| cors             | ^2.8.6     | Cross-origin request handling                |
| pino             | ^9.x       | Structured JSON logger                       |
| pino-http        | ^10.x      | Express middleware adapter for Pino          |
| pino-pretty      | ^13.x      | Human-readable log formatting (dev only)     |
| nodemailer       | ^6.9.13    | Email delivery (future use)                  |
| ts-node          | ^10.9.2    | TypeScript execution without pre-compilation |
| nodemon          | ^3.1.0     | Auto-restart during development              |

### Frontend

| Technology       | Version    | Purpose                                            |
|------------------|------------|----------------------------------------------------|
| Angular          | ^21.1.0    | UI framework (standalone components, signals)      |
| Angular Router   | ^21.1.0    | Client-side routing with route guards              |
| Apollo Angular   | ^13.0.0    | Angular integration for Apollo Client              |
| Apollo Client    | ^4.1.4     | GraphQL client with InMemoryCache                  |
| NgRx Store       | ^21.0.1    | Centralised reactive state management              |
| NgRx Effects     | ^21.0.1    | Async side-effect handling (API calls)             |
| RxJS             | ~7.8.0     | Reactive streams used throughout NgRx              |
| Bootstrap        | ^5.3.8     | CSS utility and grid system                        |
| TypeScript       | ~5.9.2     | Static typing on the frontend                      |
| Vitest           | ^4.0.8     | Unit testing framework                             |

---

## 3. Project Structure

### Backend (`server/`)

```
server/
├── server.ts                              # Entry point — loads .env, creates app, binds port
├── package.json                           # Dependencies and npm scripts
├── tsconfig.json                          # TypeScript compiler options (target: ES2020)
├── nodemon.json                           # Nodemon watch config
├── .env                                   # Environment variables (not committed)
├── .env.example                           # Example env template
└── src/
    ├── app.ts                             # Express app + Apollo Server wiring (pino-http, formatError)
    ├── config/
    │   ├── db.ts                          # MongoDB connection via Mongoose
    │   ├── logger.ts                      # Pino logger instance (pino-pretty in dev, JSON in prod)
    │   └── constants/
    │       └── globalConstants.ts         # Shared error message strings + ERROR_CODE map
    ├── errors/
    │   └── AppError.ts                    # Custom error class with typed ErrorCode; surfaced in extensions.code
    ├── validation/
    │   └── schemas.ts                     # Zod schemas for all user/post inputs + validate() helper
    ├── graphql/
    │   ├── schema.ts                      # Merges all typeDefs and resolvers
    │   ├── middleware/
    │   │   └── auth.middleware.ts         # requireAuth() — throws AppError('UNAUTHENTICATED') for protected ops
    │   ├── typedefs/
    │   │   ├── root.typedefs.ts           # Base Query and Mutation root types
    │   │   ├── types/
    │   │   │   ├── user.types.ts          # User, AuthPayload, PaginatedUsers
    │   │   │   └── post.types.ts          # Post, AllPosts, PaginatedPosts
    │   │   ├── queries/
    │   │   │   ├── user.queries.ts        # getAllUsers, me
    │   │   │   └── post.queries.ts        # posts, post
    │   │   └── mutations/
    │   │       ├── user.mutations.ts      # createUser, login, updateUser, logout
    │   │       └── post.mutations.ts      # createPost, updatePost, deletePost
    │   └── resolvers/
    │       ├── user.resolvers.ts          # User query and mutation implementations
    │       └── post.resolvers.ts          # Post query and mutation implementations
    ├── services/
    │   ├── auth.service.ts                # JWT generation, cookie management, Express middleware
    │   ├── user.service.ts                # User business logic (Zod validation + AppError codes)
    │   └── post.service.ts                # Post business logic (Zod validation + AppError codes)
    ├── repositories/
    │   ├── user.repository.ts             # All MongoDB queries for the User collection
    │   └── post.repository.ts             # All MongoDB queries for the Post collection
    ├── models/
    │   ├── user.model.ts                  # Mongoose schema + compound indexes
    │   └── post.model.ts                  # Mongoose schema + compound indexes
    └── interfaces/
        ├── auth.interface.ts              # ILoginInput, IAuthPayload, IContext
        ├── user.interface.ts              # IUser, ICreateUserInput, IUpdateUserInput, IPaginationArgs
        └── post.interface.ts              # IPost, ICreatePostData, IUpdatePostData
```

### Frontend (`client/src/app/`)

```
client/src/app/
├── app.ts                                 # Root component — initialises session restore on load
├── app.html                               # Root template — <app-toast /> + router outlet
├── app.config.ts                          # Bootstrap providers (router, NgRx, Apollo, HTTP, GlobalErrorHandler)
├── app.routes.ts                          # Route definitions (public + protected + /error)
├── core/
│   ├── services/
│   │   ├── auth.gql.service.ts            # Wraps auth GraphQL mutations/queries
│   │   ├── post.gql.service.ts            # Wraps post GraphQL mutations/queries
│   │   └── toast.service.ts               # Signal-based toast queue with auto-dismiss
│   ├── components/
│   │   └── toast/
│   │       ├── toast.ts                   # Toast component (aria-live, dismiss on click)
│   │       ├── toast.html                 # Fixed overlay; @for loop over toasts signal
│   │       └── toast.css                  # Bottom-right overlay, color-coded by type
│   ├── errors/
│   │   └── global-error-handler.ts        # GlobalErrorHandler — shows toast + navigates to /error
│   ├── guards/
│   │   └── auth.guard.ts                  # Redirects unauthenticated users to /login
│   ├── interceptors/
│   │   └── error.interceptor.ts           # Normalises errors; dispatches logout + toast on 401/UNAUTHENTICATED
│   ├── graphql/
│   │   ├── auths.graphql.ts               # LOGIN_MUTATION, SIGNUP_MUTATION, ME_QUERY
│   │   └── posts.graphql.ts               # GET_POSTS, GET_POST, CREATE_POST, UPDATE_POST, DELETE_POST
│   ├── interfaces/
│   │   ├── auth.ts                        # ILogin, ISignUp, IUser
│   │   └── post.ts                        # IPost, ICreatePost, IUpdatePost, IPaginatedPosts
│   └── constants/
│       └── globalConstants.ts             # App-level constants incl. TOAST messages and ERROR_PAGE strings
├── pages/
│   ├── home/                              # Public landing page
│   ├── auth/
│   │   ├── login/                         # Login form (email + password)
│   │   └── signup/                        # Sign-up form (name, email, password)
│   ├── dashboard/
│   │   ├── dashboard.ts                   # Layout shell — sidebar + router outlet (ARIA-enhanced)
│   │   └── dashboard-home/                # Dashboard overview / analytics home
│   ├── error/
│   │   ├── error-page.ts                  # Fallback error page (Refresh + Go Home buttons)
│   │   ├── error-page.html                # User-friendly message using GLOBAL_CONSTANTS.ERROR_PAGE
│   │   └── error-page.css                 # Centred layout with error icon
│   └── post/
│       ├── post-list/                     # Grid of posts, infinite scroll, split-panel detail (ARIA-enhanced)
│       ├── post-detail/                   # Full-page post view (mobile)
│       └── post-form/                     # Create / edit post form (dispatches tempPost for optimistic create)
├── store/
│   ├── auth/                              # Auth NgRx feature slice
│   │   ├── auth.state.ts
│   │   ├── auth.actions.ts
│   │   ├── auth.reducer.ts
│   │   ├── auth.effects.ts
│   │   └── auth.selectors.ts
│   └── post/                              # Post NgRx feature slice (optimistic update patterns)
│       ├── post.state.ts
│       ├── post.actions.ts
│       ├── post.reducer.ts
│       ├── post.effects.ts
│       └── post.selectors.ts
└── shared/
    └── validation/
        └── authValidation.ts              # Reusable form validators
```

---

## 4. Backend Architecture

### Layered Design

```
HTTP Request
     │
     ▼
Express Middleware
  ├── cors()
  ├── cookie-parser()
  ├── pinoHttp({ logger })       (structured JSON logging)
  └── authService.authMiddleware()   ← attaches userId + token to req
     │
     ▼
Apollo Server  /graphql
  └── formatError()              ← maps AppError → extensions.code; masks unknown errors in production
     │
     ▼
GraphQL Resolver  (resolvers/user.ts | resolvers/post.ts)
     │  calls requireAuth(context) for protected operations
     ▼
Service Layer  (services/user.service.ts | services/post.service.ts)
     │  Zod validation → business logic → ownership checks → AppError on failure
     ▼
Repository Layer  (repositories/user.repository.ts | repositories/post.repository.ts)
     │  raw MongoDB queries via Mongoose
     ▼
Model Layer  (models/user.model.ts | models/post.model.ts)
     │  Mongoose schema definitions + compound indexes
     ▼
MongoDB
```

### Error Propagation

All domain errors are thrown as `AppError(code, message)` in the service layer. Apollo Server's `formatError` hook reads `error.originalError` and copies the typed `code` into `extensions.code` of the GraphQL response. Clients receive both a human-readable `message` and a machine-readable `extensions.code`.

```typescript
// src/errors/AppError.ts
export type ErrorCode =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'VALIDATION_ERROR' | 'EMAIL_IN_USE' | 'INVALID_CREDENTIALS'
  | 'BAD_REQUEST' | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
  }
}
```

### Data Models

#### User (`src/models/user.model.ts`)

| Field       | Type     | Constraints                  | Notes                           |
|-------------|----------|------------------------------|---------------------------------|
| `firstName` | String   | required                     |                                 |
| `lastName`  | String   | required                     |                                 |
| `email`     | String   | required, unique             | Used as login identifier        |
| `password`  | String   | required                     | Stored as bcrypt hash           |
| `age`       | Number   | optional                     |                                 |
| `token`     | String   | optional, nullable           | Current JWT; null when logged out |
| `createdAt` | Date     | auto (timestamps)            |                                 |
| `updatedAt` | Date     | auto (timestamps)            |                                 |

**Indexes:**

| Index                              | Type   | Purpose                          |
|------------------------------------|--------|----------------------------------|
| `{ email: 1 }`                     | unique | Login lookups (Mongoose default) |
| `{ token: 1 }` (sparse)            | single | Session validation lookups       |
| `{ firstName: 1, lastName: 1 }`    | compound | Full-name search               |

#### Post (`src/models/post.model.ts`)

| Field       | Type     | Constraints                  | Notes                               |
|-------------|----------|------------------------------|-------------------------------------|
| `title`     | String   | required                     |                                     |
| `views`     | Number   | default: 0                   |                                     |
| `comments`  | String   | optional                     | Post body text                      |
| `authorId`  | ObjectId | required, ref: 'User'        | Set from JWT context on creation    |
| `isActive`  | Boolean  | default: true                | Used for soft-delete filtering      |
| `deletedAt` | Date     | optional                     | Set on soft delete                  |
| `createdAt` | Date     | auto (timestamps)            |                                     |
| `updatedAt` | Date     | auto (timestamps)            |                                     |

**Indexes:**

| Index                                          | Purpose                                   |
|------------------------------------------------|-------------------------------------------|
| `{ authorId: 1, deletedAt: 1, createdAt: -1 }` | Owner feed — sorted by newest, excludes deleted |
| `{ deletedAt: 1, createdAt: -1 }`              | Global feed — all active posts newest first |
| `{ authorId: 1, isActive: 1 }`                 | Mutation ownership checks                 |

### Input Validation (`src/validation/schemas.ts`)

All mutating service methods validate inputs with Zod before touching the database:

```typescript
// validate() helper — returns typed { data, error } union
const { data, error } = validate(CreatePostSchema, args);
if (error) throw new AppError('VALIDATION_ERROR', error);
```

Schemas defined: `CreateUserSchema`, `LoginSchema`, `UpdateUserSchema`, `CreatePostSchema`, `UpdatePostSchema`.

### Service Layer Responsibilities

#### `auth.service.ts`
- `generateToken(userId)` — Creates a signed JWT with 7-day expiry
- `authMiddleware(req, res, next)` — Reads the `token` cookie, verifies the JWT, attaches `req.userId` and `req.token`. Silently passes through if token is missing or invalid (routes remain accessible; `requireAuth` blocks them individually)
- `setTokenCookie(res, token)` — Sets an HttpOnly, SameSite=strict cookie (Secure flag added in production)
- `clearTokenCookie(res)` — Clears the cookie on logout

#### `user.service.ts`
- `createUser(args)` — Zod-validates input; checks for duplicate email → `EMAIL_IN_USE`; hashes password; inserts document
- `loginUser(credentials)` — Zod-validates; finds user → `INVALID_CREDENTIALS` if missing; compares password; generates token; persists to DB; sets cookie
- `logoutUser(userId)` — Removes stored token from DB; clears cookie
- `getUserById(userId)` — Fetches current user for the `me` query
- `updateUser(userId, fields)` — Zod-validates; partial updates to the authenticated user's profile
- `getAllUsers(args)` — Paginated list (admin/dev use)

#### `post.service.ts`
- `createPost(data)` — Zod-validates input; inserts new post; `authorId` is taken from the JWT context (not the client)
- `getPosts(args)` — Returns a paginated list of active (`isActive: true`) posts
- `getPostById(id)` — Single post fetch; throws `NOT_FOUND` if missing
- `updatePost(data, userId)` — Zod-validates; updates post fields; throws `FORBIDDEN` if caller is not the author
- `deletePost(id, userId)` — Soft-deletes (`isActive: false`, `deletedAt: now`); throws `NOT_FOUND` or `FORBIDDEN` if checks fail

### GraphQL Middleware

`requireAuth(context: IContext)` in `src/graphql/middleware/auth.middleware.ts`:

```
1. Check context.userId exists (set by authMiddleware)
2. Check context.token exists
3. Verify token in DB matches context.token (prevents reuse of revoked tokens)
4. Return userId if valid
5. Throw AppError('UNAUTHENTICATED', '...') if any check fails
   → Apollo formatError maps this to extensions.code = 'UNAUTHENTICATED'
```

### Structured Logging (`src/config/logger.ts`)

```typescript
// Development: colorized human-readable output via pino-pretty
// Production:  JSON lines (compatible with Datadog, Loki, CloudWatch, etc.)
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
});

// Attached to Express as HTTP request logger:
app.use(pinoHttp({ logger }));
```

---

## 5. Frontend Architecture

### Bootstrap and Initialisation

```
main.ts
  └── bootstrapApplication(App, appConfig)
        ├── provideRouter(routes)
        ├── provideHttpClient(withInterceptors([errorInterceptor]))
        ├── provideStore({ count, auth, post })
        ├── provideEffects(AuthEffects, PostEffects)
        ├── provideApollo()          ← uri: environment.API_URL, withCredentials: true
        └── { provide: ErrorHandler, useClass: GlobalErrorHandler }
```

On every page load `App.ngOnInit()` dispatches `AuthActions.restoreSession()`, which calls the `me` query to silently restore a live session from the existing HttpOnly cookie.

### Routing Structure

```
'' → redirect → 'home'
'home'         → Home              [public]
'login'        → Login             [public]
'signup'       → Signup            [public]
'error'        → ErrorPage         [public]  ← global fallback from GlobalErrorHandler
'dashboard'    → Dashboard         [canActivate: authGuard]
    ''             → DashboardHome
    'posts'        → PostList
    'post/new'     → PostForm       (create mode)
    'post/:postId' → PostDetail     (mobile full-page view)
    'post/:postId/edit' → PostForm  (edit mode)
```

The `authGuard` waits for `selectInitialized` (session restore completed) before evaluating `selectIsLoggedIn`, preventing a flash of the login page on hard refresh.

### Global Error Handler (`core/errors/global-error-handler.ts`)

Implements Angular's `ErrorHandler` DI token to intercept all uncaught exceptions:

```typescript
handleError(error: unknown): void {
  console.error('[GlobalErrorHandler]', error);
  this.zone.run(() => {
    this.toastSvc.show(GLOBAL_CONSTANTS.TOAST.UNEXPECTED_ERROR, 'error');
    this.router.navigate(['/error']);
  });
}
```

`NgZone.run()` is required to ensure Angular's change detection triggers when an error is thrown outside the zone.

### Toast Service (`core/services/toast.service.ts`)

Signal-based notification queue with auto-dismiss:

```typescript
@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts  = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = Date.now();
    this._toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }
  dismiss(id: number): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
```

The `<app-toast />` component is placed in `app.html` above the `@if (!initialized())` block so toasts render during the session-restore loading phase.

### Post List Component (`post-list.ts`)

This component implements the most complex UI interaction:

| Concern            | Implementation                                                          |
|--------------------|-------------------------------------------------------------------------|
| Infinite scroll    | `IntersectionObserver` watches a sentinel `<div>` at the bottom         |
| Load more trigger  | Fires when sentinel is visible AND `hasMore() && !loading() && !loadingMore()` |
| Desktop detail     | Clicking a card opens a split-panel (right column expands with CSS animation) |
| Mobile detail      | Clicking a card navigates to `/dashboard/post/:id`                      |
| Viewport detection | `window.innerWidth >= 768` at click time                                |
| Panel loading      | Separate `panelLoading` signal — does not show skeleton over the list    |
| Panel auto-dismiss | `effect()` turns off `panelLoading` when `selectedPost().id === selectedPostId()` |
| Accessibility      | `<ul role="list">` / `<li role="listitem">`; cards have `tabindex="0"` + keyboard handlers; `aria-busy`, `aria-live="assertive"` on error |

### Dashboard Shell (`dashboard.ts`)

Implements a CRM-style sidebar layout:
- `.ds-sidebar` — 260 px fixed-width nav (links + user info); `id="ds-sidebar"`, `aria-label="Main navigation"`
- `.ds-main` — Flex-grow scrollable content area containing `<router-outlet />`
- Mobile: sidebar is off-canvas (`position: fixed; left: -280px`), toggled by hamburger with `aria-expanded` / `aria-controls`
- `.ds-backdrop` uses `pointer-events: none` when hidden to prevent click interception; `role="presentation"`, `keydown.escape` to close

---

## 6. Authentication Flow

### Sign Up

```
User fills form
  → dispatch AuthActions.signup({ input })
    → AuthEffects.signup$ calls authGql.signup(input)
      → GraphQL createUser mutation
        → userService.createUser()
          → validate(CreateUserSchema, args)  ← Zod check
          → bcrypt.hash(password, 10)
          → userRepository.create(doc)
            → MongoDB insert
          ← returns User document
        ← returns { id, email, firstName, lastName }
      ← mutation response
    → dispatch AuthActions.signupSuccess()
      → router.navigate(['/login'])
```

### Login

```
User fills form
  → dispatch AuthActions.login({ credentials })
    → AuthEffects.login$ calls authGql.login(credentials)
      → GraphQL login mutation
        → userService.loginUser(email, password)
          → validate(LoginSchema, credentials)  ← Zod check
          → userRepository.findByEmail(email)
          → bcrypt.compare(password, user.password)
          → authService.generateToken(userId)   ← JWT
          → userRepository.saveToken(userId, token)   ← persisted to DB
          → authService.setTokenCookie(res, token)    ← HttpOnly cookie set
          ← returns { user: { id, email, firstName, lastName } }
      ← mutation response (cookie is set by the browser automatically)
    → dispatch AuthActions.loginSuccess({ user })
      → router.navigate(['/dashboard'])
```

### Session Restore (on any page load / refresh)

```
App.ngOnInit()
  → dispatch AuthActions.restoreSession()
    → AuthEffects.restoreSession$ calls authGql.me()
      → GraphQL me query (cookie sent automatically)
        → authService.authMiddleware()   ← validates JWT from cookie
          → attaches req.userId + req.token to context
        → requireAuth(context)
          → verifies token matches DB record
        → userRepository.findById(userId)
        ← returns User
      ← query response
    → dispatch AuthActions.restoreSessionSuccess({ user })
      → AuthState: initialized = true, user = payload

  OR on error (expired/cleared cookie):
    → dispatch AuthActions.logout()
      → AuthState: initialized = true, user = null
      → authGuard permits redirect to /login
```

### Session Expiry (401 / UNAUTHENTICATED mid-session)

```
Any GraphQL mutation/query returns 401 or extensions.code === 'UNAUTHENTICATED'
  → errorInterceptor detects isUnauthenticated = true
    → store.dispatch(AuthActions.logout())
    → toast.show(TOAST.SESSION_EXPIRED, 'warning')
    → router.navigate(['/login'])
```

### Logout

```
User clicks Logout
  → dispatch AuthActions.logout()
    → AuthEffects.logout$ (optional: calls logout mutation to clear DB token + cookie)
    → AuthState reset (user: null, initialized: true)
    → router.navigate(['/login'])
```

---

## 7. GraphQL Schema Reference

### Types

```graphql
# ── User ─────────────────────────────────────────────────────────────────────
type User {
  id:        ID
  firstName: String
  lastName:  String
  email:     String
  age:       Int
}

type AuthPayload {
  user: User!
}

type PaginatedUsers {
  data:       [User]
  total:      Int
  page:       Int
  totalPages: Int
}

# ── Post ─────────────────────────────────────────────────────────────────────
type Post {
  id:       ID
  title:    String
  views:    Int
  comments: String    # Post body / content
  authorId: ID
}

type AllPosts {        # Lightweight type for list views (no body)
  id:       ID
  title:    String
  views:    Int
  authorId: ID
}

type PaginatedPosts {
  data:       [AllPosts]
  total:      Int
  page:       Int
  totalPages: Int
}
```

### Queries

```graphql
type Query {
  # ── User ─────────────────────────────────────────
  getAllUsers(page: Int, limit: Int): PaginatedUsers   # Requires auth
  me: User                                             # Requires auth

  # ── Post ─────────────────────────────────────────
  posts(page: Int, limit: Int): PaginatedPosts         # Requires auth
  post(id: ID!): Post                                  # Requires auth
}
```

### Mutations

```graphql
type Mutation {
  # ── User ─────────────────────────────────────────
  createUser(
    firstName: String!
    lastName:  String!
    email:     String!
    password:  String!
    age:       Int
  ): User                      # Public

  login(
    email:    String!
    password: String!
  ): AuthPayload               # Public — sets HttpOnly cookie

  updateUser(
    firstName: String
    lastName:  String
    email:     String
    age:       Int
  ): User                      # Requires auth

  logout: Boolean              # Requires auth — clears cookie + DB token

  # ── Post ─────────────────────────────────────────
  createPost(
    title:    String!
    views:    Int
    comments: String
  ): Post                      # Requires auth — authorId taken from context

  updatePost(
    id:       ID!
    title:    String
    views:    Int
    comments: String
  ): Post                      # Requires auth — must be post owner

  deletePost(id: ID!): Post    # Requires auth — must be post owner, soft-deletes
}
```

### Error Shape

Every GraphQL error from `AppError` includes an `extensions.code` field:

```json
{
  "errors": [{
    "message": "You must be logged in",
    "extensions": { "code": "UNAUTHENTICATED" }
  }]
}
```

Defined codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `EMAIL_IN_USE`, `INVALID_CREDENTIALS`, `BAD_REQUEST`, `INTERNAL_ERROR`.

---

## 8. NgRx State Management

### Global Store Shape

```typescript
interface AppState {
  count: number;      // Counter demo slice
  auth:  AuthState;   // Authentication feature
  post:  PostState;   // Post management feature
}
```

### Auth Feature Slice

**State:**
```typescript
interface AuthState {
  user:        IUser | null;   // null = not logged in
  loading:     boolean;        // true while login/signup API call is in flight
  error:       string | null;  // last error message
  initialized: boolean;        // true once restoreSession completes (prevents guard flash)
}
```

**Action → Reducer Transitions:**

| Action                  | Effect on State                                  |
|-------------------------|--------------------------------------------------|
| `login`                 | `loading: true, error: null`                     |
| `loginSuccess`          | `user: payload, loading: false, initialized: true` |
| `loginFailure`          | `error: payload, loading: false`                 |
| `signup`                | `loading: true, error: null`                     |
| `signupSuccess`         | `loading: false`                                 |
| `signupFailure`         | `error: payload, loading: false`                 |
| `restoreSession`        | `loading: true`                                  |
| `restoreSessionSuccess` | `user: payload, initialized: true, loading: false` |
| `logout`                | Reset to initial state, keep `initialized: true` |

**Selectors:**
```
selectUser          → IUser | null
selectIsLoggedIn    → boolean (!! user)
selectLoading       → boolean
selectError         → string | null
selectInitialized   → boolean
```

### Post Feature Slice

**State:**
```typescript
interface PostState {
  posts:        IPost[];       // Accumulated list (infinite scroll appends here)
  total:        number;        // Total posts in DB matching query
  page:         number;        // Most recently loaded page number
  totalPages:   number;        // Derived from total / limit on server
  selectedPost: IPost | null;  // Loaded for the split-panel detail view
  loading:      boolean;       // True while loadPosts or loadPost is in flight
  loadingMore:  boolean;       // True while loadMorePosts is in flight
  error:        string | null;
}
```

**Action → Reducer Transitions (including optimistic updates):**

| Action                  | Effect on State                                                                   |
|-------------------------|-----------------------------------------------------------------------------------|
| `loadPosts`             | `loading: true, error: null`                                                      |
| `loadPostsSuccess`      | `posts: result.data` (replaces), update pagination                                |
| `loadMorePosts`         | `loadingMore: true`                                                               |
| `loadMorePostsSuccess`  | `posts: [...existing, ...result.data]` (appends), update page                    |
| `loadPost`              | `loading: true, selectedPost: null`                                               |
| `loadPostSuccess`       | `selectedPost: post, loading: false`                                              |
| **`createPost`**        | **Optimistic:** prepend `tempPost` to `posts`; `loading: true`                    |
| **`createPostSuccess`** | Swap `tempPost` (matched by `tempId`) with real server post; `loading: false`     |
| **`createPostFailure`** | **Rollback:** remove `tempPost` by `tempId`; `loading: false, error: msg`         |
| `updatePostSuccess`     | Replace matching post in array; set `selectedPost`                                |
| **`deletePost`**        | **Optimistic:** remove post by `id` from `posts`; `loading: true`                 |
| `deletePostSuccess`     | `loading: false` (post already removed optimistically)                            |
| **`deletePostFailure`** | **Rollback:** restore post to front of `posts`; `loading: false, error: msg`      |
| `clearSelectedPost`     | `selectedPost: null`                                                              |

**Optimistic action shapes:**
```typescript
createPost:        props<{ input: ICreatePost; tempPost: IPost; tempId: string }>()
createPostSuccess: props<{ post: IPost; tempId: string }>()
createPostFailure: props<{ error: string; tempId: string }>()
deletePost:        props<{ id: string; post: IPost }>()     // full post for rollback
deletePostFailure: props<{ error: string; post: IPost }>()
```

**Selectors:**
```
selectPosts           → IPost[]
selectPostsPage       → number
selectPostsTotalPages → number
selectPostsHasMore    → boolean  (page < totalPages)
selectSelectedPost    → IPost | null
selectPostLoading     → boolean
selectPostLoadingMore → boolean
selectPostError       → string | null
```

**Effects:**

| Effect                  | Operator     | Calls                     | On Success → Action / Side Effect                     |
|-------------------------|--------------|---------------------------|-------------------------------------------------------|
| `loadPosts$`            | `switchMap`  | `postGql.getPosts(p, l)`  | `loadPostsSuccess`                                    |
| `loadMorePosts$`        | `exhaustMap` | `postGql.getPosts(p, l)`  | `loadMorePostsSuccess`                                |
| `loadPost$`             | `switchMap`  | `postGql.getPost(id)`     | `loadPostSuccess`                                     |
| `createPost$`           | `switchMap`  | `postGql.createPost(i)`   | `createPostSuccess` (carries `tempId`)                |
| `createPostSuccess$`    | `tap`        | —                         | Toast `POST_CREATED` + navigate to `/dashboard/posts` |
| `createPostFailure$`    | `tap`        | —                         | Toast `POST_CREATE_FAILED` (rollback already in reducer) |
| `updatePost$`           | `switchMap`  | `postGql.updatePost(i)`   | `updatePostSuccess`                                   |
| `updatePostSuccess$`    | `tap`        | —                         | Toast `POST_UPDATED` + navigate to `/dashboard/post/:id` |
| `deletePost$`           | `switchMap`  | `postGql.deletePost(id)`  | `deletePostSuccess`                                   |
| `deletePostSuccess$`    | `tap`        | —                         | Navigate to `/dashboard/posts`                        |
| `deletePostFailure$`    | `tap`        | —                         | Toast `POST_DELETE_FAILED` (rollback already in reducer) |

`exhaustMap` is used for `loadMorePosts$` so rapid scroll events do not stack requests — the current request must complete before a new one is accepted.

---

## 9. API Communication Pattern

### Apollo Client Setup

```typescript
// client/src/app/app.config.ts
provideApollo(() => {
  const httpLink = inject(HttpLink);
  return {
    link: httpLink.create({
      uri: environment.API_URL,    // from environment.development.ts / environment.ts
      withCredentials: true,       // sends HttpOnly cookie on every request
    }),
    cache: new InMemoryCache(),
  };
})
```

`withCredentials: true` is the critical flag that allows the browser to include the authentication cookie on cross-origin requests to the API.

### Service Layer

Both GQL services (`auth.gql.service.ts`, `post.gql.service.ts`) are thin wrappers that:
1. Call `apollo.mutate()` or `apollo.query()` with a typed document
2. Map the result using `map(res => res.data.operationName)` to extract the payload
3. Use `fetchPolicy: 'no-cache'` on queries that must always reflect current server state

All responses flow into NgRx effects via RxJS operators; no Apollo cache is used for state persistence (NgRx store is the single source of truth).

### Error Handling

The `errorInterceptor` (HTTP interceptor) normalises all errors and handles session expiry:

```
GraphQL error with extensions.code === 'UNAUTHENTICATED'
HTTP 401               → dispatch AuthActions.logout()
                         toast SESSION_EXPIRED
                         navigate ['/login']

HTTP 0                 → toast NETWORK_ERROR
HTTP 403               → toast PERMISSION_DENIED
HTTP 5xx               → toast UNEXPECTED_ERROR
Other GraphQL errors   → extract errors[0].message; dispatch *Failure action
```

Effects catch errors and dispatch `*Failure` actions which update `error` in state. Components read `selectError` / `selectPostError` signals to display inline error messages. Failure effects also show user-facing toasts where a rollback occurred (delete failure, create failure).

---

## 10. Security Design

### Token Strategy — HttpOnly Cookies vs localStorage

| Concern          | localStorage           | HttpOnly Cookie (this app)         |
|------------------|------------------------|------------------------------------|
| XSS Access       | Vulnerable             | Immune (JS cannot read it)         |
| CSRF             | Immune                 | Mitigated by SameSite=strict       |
| Auto-send        | Manual (Authorization header) | Automatic by browser          |
| Expiry control   | Manual                 | maxAge / expires on cookie         |

### Defence Layers

| Layer                 | Protection                                                       |
|-----------------------|------------------------------------------------------------------|
| **Input validation**  | Zod schemas in service layer; validated before any DB operation  |
| **Password storage**  | bcrypt hash (cost factor 10); plain text never persisted         |
| **Token issuance**    | JWT signed with `JWT_SECRET`; 7-day expiry                       |
| **Token revocation**  | Token stored in DB; `requireAuth` compares DB copy — logout invalidates immediately |
| **Cookie flags**      | `HttpOnly`, `SameSite=strict`, `Secure` (production)             |
| **CORS**              | Origin restricted to `CLIENT_URL` env variable                   |
| **Ownership**         | `updatePost` / `deletePost` reject requests where caller ≠ author |
| **Soft delete**       | Posts are never physically deleted; `isActive=false` preserves audit trail |
| **Error masking**     | In production, unknown errors return a generic message; only `AppError` codes are forwarded |

---

## 11. Suggested Improvements

### Backend

| # | Area              | Suggestion                                                                                                   |
|---|-------------------|--------------------------------------------------------------------------------------------------------------|
| 1 | Refresh tokens    | Implement short-lived access tokens (15 min) + long-lived refresh tokens to reduce stolen-token window.      |
| 2 | Rate limiting     | Apply `express-rate-limit` to `/graphql` — especially the `login` mutation — to defend against brute-force.  |
| 3 | Query complexity  | Add Apollo's `graphql-query-complexity` plugin to reject deeply nested or expensive queries.                 |
| 4 | Pagination cursor | Replace offset/page pagination with cursor-based pagination to avoid skipped/duplicated items on concurrent writes. |
| 5 | Health endpoint   | Add `GET /health` REST endpoint returning DB connectivity status for infrastructure monitoring.               |
| 6 | Test coverage     | Add unit tests for services and repositories (Jest + `mongodb-memory-server` for in-process DB).             |

### Frontend

| # | Area              | Suggestion                                                                                                   |
|---|-------------------|--------------------------------------------------------------------------------------------------------------|
| 1 | Skeleton screens  | Extend skeleton loaders to dashboard home stats cards (currently loads with a flash of empty content).       |
| 2 | NgRx Entity       | Replace `posts: IPost[]` with the NgRx Entity adapter (`EntityState`) for O(1) lookups and simpler reducers. |
| 3 | Form library      | Introduce Angular Reactive Forms for post and auth forms (dirty/touched tracking, async validators).         |
| 4 | Test coverage     | Add component tests with Angular Testing Library; store/effect tests using `provideMockStore` / `provideMockActions` from NgRx. |
| 5 | PWA / offline     | Add Angular Service Worker (`@angular/pwa`) with cache-first for static assets, network-first for GraphQL.  |

### Infrastructure

| # | Area              | Suggestion                                                                                         |
|---|-------------------|----------------------------------------------------------------------------------------------------|
| 1 | Docker            | Add a `docker-compose.yml` with services for `mongo`, `server`, and `client` to make local setup reproducible. |
| 2 | CI/CD             | Add a GitHub Actions pipeline: lint → test → build → deploy on push to `main`. |
| 3 | Environment parity | Use a cloud MongoDB instance (MongoDB Atlas free tier) even in development to avoid "works on my machine" issues. |
| 4 | HTTPS in dev      | Run the dev server over HTTPS (using a self-signed cert or `mkcert`) so `Secure` cookies work end-to-end locally. |

---

*Last updated: February 2026*
