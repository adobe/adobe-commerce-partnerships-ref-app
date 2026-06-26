## Architectural Notes

## Overview

This project follows the **MVC (Model-View-Controller)** pattern, adapted for a Next.js/React environment. The goal is to separate concerns, improve maintainability, and make the codebase scalable as the application grows.

---

## Layers

### 1. **Model (`/models`)**

- **Purpose:**  
  Encapsulate data structures, validation, and business logic.
- **Implementation:**
  - Uses [Zod](https://zod.dev/) schemas for type-safe validation.
  - Each resource (e.g., Customer, Order, Subscription) has its own schema and type.
  - Business logic related to data (e.g., computed properties, transformations) can be added here.

### 2. **Controller (`/controllers`)**

- **Purpose:**  
  Orchestrate business logic, interact with models, and handle external API/database calls.
- **Implementation:**
  - Each resource has a controller file (e.g., `customerController.ts`).
  - Controllers validate input, call external APIs, and handle errors using the `ApiError` utility.
  - Controllers are responsible for all non-trivial business logic and data orchestration.

### 3. **View (`/pages`, `/components`)**

- **Purpose:**  
  Render UI and handle user interaction.
- **Implementation:**
  - `/pages` contains Next.js pages (route entry points).
  - `/components` contains reusable UI components.
  - Data fetching is done via API routes using TanStack Query for caching and state management.

### 4. **API Routes (`/pages/api`)**

- **Purpose:**  
  Serve as the entry point for HTTP requests.
- **Implementation:**
  - API routes are thin: they parse requests, handle authentication, and delegate to controllers.
  - Centralized error handling: all errors are caught and returned in a consistent format.

### 5. **Utilities (`/utils`)**

- **Purpose:**  
  Provide shared utilities (e.g., error handling).
- **Implementation:**
  - `ApiError` class standardizes error handling across controllers and API routes.

---

## Error Handling

- All business logic errors are thrown as `ApiError` instances in controllers.
- API routes catch these errors and return the appropriate HTTP status and message.
- Unknown errors are returned as a generic 500 Internal Server Error.

---

## Data Validation

- All incoming and outgoing data is validated using Zod schemas in the model layer.
- This ensures type safety and prevents invalid data from propagating through the system.

---

## Documentation

- All models and controllers are documented with JSDoc comments.
- The README includes sections on error handling, documentation, and project structure.

---

## Extending the Architecture

- **Adding a new resource:**
  1. Create a new model schema in `/models`.
  2. Add a controller in `/controllers`.
  3. Add an API route in `/pages/api`.
  4. Add UI components/pages as needed.
- **Adding new endpoints:**  
  Add new methods to controllers and expose them via API routes.

---

## Benefits

- **Separation of concerns:** Each layer has a clear responsibility.
- **Testability:** Business logic is isolated in controllers and models, making it easy to test.
- **Scalability:** New features and resources can be added with minimal impact on existing code.
