# Support API Testing Guide

## Prerequisites

- Server running: `http://localhost:5000/api`
- You need a JWT token (login first)

## Quick Test Commands

### 1. Login (get JWT token)

```bash
# As regular user
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# As admin
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"adminnew@test.com","password":"Test123!"}'
```

Save the `access_token` from the response.

### 2. User Endpoints (Regular User)

```bash
TOKEN="YOUR_JWT_TOKEN_HERE"

# Create a ticket
curl -X POST http://localhost:5000/api/support \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Help needed","message":"Detailed description"}'

# Add message to ticket (replace :ticketId with actual ID)
curl -X POST http://localhost:5000/api/support/:ticketId/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"My message"}'

# Get messages for a ticket
curl http://localhost:5000/api/support/:ticketId/messages \
  -H "Authorization: Bearer $TOKEN"

# Get my tickets
curl http://localhost:5000/api/support/my-tickets \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Admin Endpoints

```bash
ADMIN_TOKEN="ADMIN_JWT_TOKEN"

# Get all tickets
curl http://localhost:5000/api/support \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Close a ticket
curl -X PATCH http://localhost:5000/api/support/:ticketId/close \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4. Expected Responses

**Create Ticket (200 OK):**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "subject": "Help needed",
  "message": "Detailed description",
  "status": "OPEN",
  "createdAt": "2026-04-23T...",
  "updatedAt": "2026-04-23T..."
}
```

**Add Message (200 OK):**

```json
{
  "id": "uuid",
  "ticketId": "uuid",
  "senderId": "uuid",
  "senderRole": "STUDENT",
  "message": "My message",
  "createdAt": "2026-04-23T..."
}
```

**Get Messages (200 OK):**

```json
[
  {
    "id": "...",
    "message": "...",
    "senderRole": "STUDENT",
    "createdAt": "..."
  }
]
```

**Get My Tickets (200 OK):**

```json
[
  {
    "id": "uuid",
    "subject": "...",
    "message": "...",
    "status": "OPEN|RESOLVED",
    "messages": [...]
  }
]
```

**Admin - Get All (200 OK):**
Same as get my tickets but returns ALL tickets in system.

**Admin - Close Ticket (200 OK):**
Returns updated ticket with `"status": "RESOLVED"`

**Forbidden (403):**

```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

## Complete Test Flow Example

```bash
# Step 1: Login as user
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' | \
  grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Step 2: Create ticket
TICKET_ID=$(curl -s -X POST http://localhost:5000/api/support \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"API Test","message":"Testing"}' | \
  grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Ticket ID: $TICKET_ID"

# Step 3: Add message
curl -X POST "http://localhost:5000/api/support/$TICKET_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Reply"}'

# Step 4: Get messages
curl "http://localhost:5000/api/support/$TICKET_ID/messages" \
  -H "Authorization: Bearer $TOKEN"

# Step 5: Get my tickets
curl "http://localhost:5000/api/support/my-tickets" \
  -H "Authorization: Bearer $TOKEN"

# Step 6: Try admin endpoint (will fail)
curl "http://localhost:5000/api/support" \
  -H "Authorization: Bearer $TOKEN"

# Step 7: Login as admin and close ticket
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"adminnew@test.com","password":"Test123!"}' | \
  grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

curl -X PATCH "http://localhost:5000/api/support/$TICKET_ID/close" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Run the Automated Test Script

```bash
./test_support_api.sh
```

Note: The script tries to register a new user. If you want to use existing users, modify the script to skip registration and just login.

## Known Issues

1. **Ticket Status Enum**: Database uses `RESOLVED` not `CLOSED`. Closed tickets show `"status":"RESOLVED"`
2. **Message Required**: Creating a ticket requires both `subject` and `message` fields
3. **Authentication**: All endpoints except login/register require a valid JWT token in the Authorization header
