---
status: complete
created_at: 2026-06-09T16:38:06.702Z
---

# Fix Frontend Dev Proxy

Task: Fix frontend dev proxy so `/api/v1` requests reach FastAPI without stripping `/api`.

## Plan

1. Confirm the backend route exists directly on port 8000.
2. Inspect the Vite proxy configuration.
3. Remove the rewrite that strips `/api`.
4. Restart the frontend container and verify `/api/v1/auth/bootstrap` through port 5173 reaches FastAPI.
