#!/bin/bash

# Support API Test Script
# Run this to test all support endpoints

BASE_URL="http://localhost:5000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Support API Test Suite"
echo "=========================================="

# Use existing verified user to avoid OTP verification
# You can change these to any verified user in your database
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test123!"

# Optional: Create a new user if needed (requires OTP verification from DB)
# echo -e "\n${YELLOW}1. Registering test user...${NC}"
# curl -s -X POST "$BASE_URL/auth/register" \
#   -H "Content-Type: application/json" \
#   -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"role\":\"STUDENT\"}"
# echo ""
# echo "Note: OTP verification required. Check server logs or verify via:"
# echo "  docker exec lms_postgres psql -U postgres -d lms_db -c \"SELECT otp FROM \\\"User\\\" WHERE email='$TEST_EMAIL';\""
# exit 1

# Test 1: Login
echo -e "\n${YELLOW}1. Logging in as $TEST_EMAIL...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "\n${RED}ERROR: Failed to get token. Response: $LOGIN_RESPONSE${NC}"
  exit 1
fi

echo -e "\n${GREEN}✓ Got JWT token${NC}"

# Test 3: Create support ticket
echo -e "\n${YELLOW}3. Creating support ticket...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/support" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test Ticket Subject","message":"This is a test ticket message"}')
echo "$CREATE_RESPONSE"

TICKET_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TICKET_ID" ]; then
  echo -e "\n${RED}ERROR: Failed to create ticket${NC}"
  exit 1
fi

echo -e "\n${GREEN}✓ Ticket created with ID: $TICKET_ID${NC}"

# Test 4: Add message to ticket
echo -e "\n${YELLOW}4. Adding message to ticket...${NC}"
curl -s -X POST "$BASE_URL/support/$TICKET_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"This is my first message"}'
echo -e "\n${GREEN}✓ Message added${NC}"

# Test 5: Get all messages for ticket
echo -e "\n${YELLOW}5. Getting all messages...${NC}"
curl -s "$BASE_URL/support/$TICKET_ID/messages" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo -e "${GREEN}✓ Messages retrieved${NC}"

# Test 6: Get user's tickets
echo -e "\n${YELLOW}6. Getting my tickets...${NC}"
curl -s "$BASE_URL/support/my-tickets" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo -e "${GREEN}✓ Tickets retrieved${NC}"

# Test 7: Try to get all tickets (should fail for non-admin)
echo -e "\n${YELLOW}7. Testing admin endpoint as regular user (should fail)...${NC}"
curl -s "$BASE_URL/support" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo -e "${GREEN}✓ Correctly denied access${NC}"

# Test 8: Try to close ticket (should fail for non-admin)
echo -e "\n${YELLOW}8. Testing close ticket as regular user (should fail)...${NC}"
curl -s -X PATCH "$BASE_URL/support/$TICKET_ID/close" \
  -H "Authorization: Bearer $TOKEN"
echo ""
echo -e "${GREEN}✓ Correctly denied access${NC}"

# Test 9: Login as admin and test admin endpoints
echo -e "\n${YELLOW}9. Logging in as admin...${NC}"
# Using a verified admin from database (daveken1738@gmail.com verified)
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daveken1738@gmail.com","password":"Test123!"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓ Admin logged in${NC}"

# Test 10: Get all tickets as admin
echo -e "\n${YELLOW}10. Admin: Getting all tickets...${NC}"
curl -s "$BASE_URL/support" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo ""
echo -e "${GREEN}✓ Admin retrieved all tickets${NC}"

# Test 11: Close ticket as admin
echo -e "\n${YELLOW}11. Admin: Closing ticket...${NC}"
curl -s -X PATCH "$BASE_URL/support/$TICKET_ID/close" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo ""
echo -e "${GREEN}✓ Ticket closed${NC}"

# Test 12: Verify ticket is closed
echo -e "\n${YELLOW}12. Verifying ticket status...${NC}"
curl -s "$BASE_URL/support/$TICKET_ID/messages" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo -e "\n=========================================="
echo -e "${GREEN}All tests completed!${NC}"
echo "=========================================="
