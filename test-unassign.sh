#!/bin/bash

# Get the first load with TRIP_ACCEPTED status
LOAD_ID="696cbdc4655cb24348a8ea69"  # LOAD-1005
AUTH_TOKEN="your_auth_token_here"

echo "Testing UNASSIGN endpoint for load: $LOAD_ID"
echo ""

curl -X POST http://localhost:5000/api/loads/$LOAD_ID/unassign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"reason":"Driver reassignment needed"}'

echo ""
echo "Done!"
