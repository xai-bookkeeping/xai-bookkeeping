---
status: complete
completed_at: 2026-06-09T16:38:06.702Z
---

# Summary

Removed the frontend dev-server proxy rewrite that stripped `/api` from requests before forwarding them to FastAPI.

Verified `http://localhost:5173/api/v1/auth/bootstrap` now reaches FastAPI and returns the expected unauthenticated `401 Authentication is required` response instead of a Vite `404`.
