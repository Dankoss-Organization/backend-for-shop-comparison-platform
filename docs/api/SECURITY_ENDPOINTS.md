# Security Endpoints Implementation

This document describes the three new authentication security endpoints that have been implemented.

## Endpoints Overview

### 1. PUT /auth/change-password

**Purpose**: Change user password with verification of the current password

**Authentication**: Required (JWT Bearer Token)

**Request Body**:

```json
{
  "currentPassword": "string (min 6 chars)",
  "newPassword": "string (min 6 chars)"
}
```

**Response**:

- **Success (200 OK)**:

```json
{
  "message": "Password changed successfully"
}
```

- **Errors**:
  - `401 Unauthorized`: Current password is incorrect
  - `401 Unauthorized`: User not found or has no password set

**Example**:

```bash
curl -X PUT http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword123"
  }'
```

### 2. GET /auth/sessions

**Purpose**: Get list of all active sessions for the current user

**Authentication**: Required (JWT Bearer Token)

**Response**:

- **Success (200 OK)**:

```json
{
  "sessions": [
    {
      "id": "session-id-uuid",
      "token": "token-hash",
      "userId": "user-id",
      "expiresAt": "2026-07-03T00:00:00.000Z",
      "createdAt": "2026-06-03T12:30:00.000Z",
      "updatedAt": "2026-06-03T12:30:00.000Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    },
    ...
  ]
}
```

**Example**:

```bash
curl -X GET http://localhost:3000/auth/sessions \
  -H "Authorization: Bearer <token>"
```

### 3. DELETE /auth/sessions/:id

**Purpose**: Terminate a specific session

**Authentication**: Required (JWT Bearer Token)

**Parameters**:

- `id` (path parameter): Session ID to delete

**Response**:

- **Success (200 OK)**:

```json
{
  "message": "Session terminated successfully"
}
```

- **Errors**:
  - `401 Unauthorized`: Session not found or does not belong to this user

**Example**:

```bash
curl -X DELETE http://localhost:3000/auth/sessions/session-id-uuid \
  -H "Authorization: Bearer <token>"
```

## Implementation Details

### Files Created

1. **[apps/backend/src/auth/dto/change-password.dto.ts](../apps/backend/src/auth/dto/change-password.dto.ts)**
   - Data Transfer Object for the change password request
   - Validates that both currentPassword and newPassword are strings with minimum 6 characters

### Files Modified

1. **[apps/backend/src/auth/auth.service.ts](../apps/backend/src/auth/auth.service.ts)**
   - Added `changePassword()` method: Verifies current password and updates with new hashed password
   - Added `getUserSessions()` method: Retrieves all active sessions for a user
   - Added `deleteSessionById()` method: Deletes a specific session by ID

2. **[apps/backend/src/auth/auth.controller.ts](../apps/backend/src/auth/auth.controller.ts)**
   - Added `PUT /auth/change-password` endpoint
   - Added `GET /auth/sessions` endpoint
   - Added `DELETE /auth/sessions/:id` endpoint
   - All endpoints protected with `@UseGuards(JwtAuthGuard)`
   - Added proper error handling and validation

### Test Files Created

1. **[apps/backend/src/auth/auth.service.spec.ts](../apps/backend/src/auth/auth.service.spec.ts)**
   - Unit tests for the three new auth service methods
   - Tests password change functionality, password validation, and session management

2. **[apps/backend/src/auth/auth.controller.spec.ts](../apps/backend/src/auth/auth.controller.spec.ts)**
   - Unit tests for the three new auth controller endpoints
   - Tests error handling and authorization

## Security Features

1. **Password Change**:
   - Requires verification of current password using bcrypt
   - New password is hashed with bcrypt (salt 10) before storage
   - Throws `UnauthorizedException` if current password is incorrect

2. **Session Management**:
   - Sessions are retrieved from database with user filtering
   - Deleting a session verifies ownership (belongs to current user)
   - Prevents cross-user session manipulation

3. **Authentication**:
   - All endpoints require JWT Bearer token authentication
   - Uses existing `JwtAuthGuard` for protection
   - Uses `@GetUser()` decorator to get authenticated user context

## Database Models Used

The implementation uses these existing Prisma models:

- **User**: Stores user data including hashed password
- **Session**: Stores session records with token, expiration, and metadata

No database migrations are required as these models already exist.

## Testing

To run the tests:

```bash
npm test -- auth.service.spec.ts
npm test -- auth.controller.spec.ts
```

To run the backend in development mode:

```bash
npm run start:dev
```

Then test the endpoints with the curl examples provided above.
