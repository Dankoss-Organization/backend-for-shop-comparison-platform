# Authentication

This section describes authentication endpoints, token flows and scopes.

Endpoints

- POST /api/v1/auth/login
  - Description: exchange credentials for an access token (JWT).
  - Body: { email: string, password: string }
  - Response: { accessToken: string, expiresIn: number }

- POST /api/v1/auth/logout
  - Description: invalidate refresh tokens or sessions (if applicable).

- POST /api/v1/auth/refresh
  - Description: refresh access token using a refresh token.
  - Body: { refreshToken: string }
  - Response: { accessToken: string, expiresIn: number }

Notes

- Use `Authorization: Bearer <token>` header for protected endpoints.
- Describe role-based access where relevant (admin vs user).
