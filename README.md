# CampusCab API Documentation

## POST `/user/register`

### Description

Registers a new user in the system. This endpoint validates the provided data and creates a new user account if the data is valid and the email is not already in use.

### Request Body

Send a JSON object with the following structure:

```json
{
  "fullname": {
    "firstname": "John",
    "lastname": "Doe"
  },
  "email": "john.doe@example.com",
  "password": "yourpassword"
}
```

- `fullname.firstname` (string, required): First name, minimum 3 characters.
- `fullname.lastname` (string, optional): Last name, minimum 3 characters if provided.
- `email` (string, required): Must be a valid email address.
- `password` (string, required): Minimum 6 characters.

### Responses

- **201 Created**

  - User registered successfully.
  - Returns: `{ "token": "<jwt_token>", "user": { ...userData } }`

- **400 Bad Request**

  - Validation failed or missing required fields.
  - Returns: `{ "errors": [ ... ] }`

- **401 Unauthorized**
  - Email already exists or invalid credentials (if enabled).
  - Returns: `{ "message": "User already exist" }` or `{ "message": "Invalid email or password" }`

### Example Request

```bash
curl -X POST http://localhost:PORT/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": { "firstname": "Alice", "lastname": "Smith" },
    "email": "alice.smith@example.com",
    "password": "securePass123"
  }'
```

### Example Success Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d0fe4f5311236168a109ca",
    "fullname": {
      "firstname": "Alice",
      "lastname": "Smith"
    },
    "email": "alice.smith@example.com"
    // ...other user fields
  }
}
```
