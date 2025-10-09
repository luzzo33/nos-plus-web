# Backend Prototypes

The material in this folder originated from an internal Express API that depended on private services (MySQL pools, helper utilities, etc.). The code is kept only as documentation of the original design and is not wired into the public frontend build.

Key notes:

- `legacy-express/` contains the original route handlers and middleware.
- The modules expect environment variables, database pools, and helper packages that are **not included** in this repository.
- Use these files strictly as reference when recreating private infrastructure; do not rely on them in production.
