#!/bin/bash

# V380 CCTV PTZ Control - API Testing Guide
# Test all PTZ commands via the backend API

BASE_URL="http://localhost:5000"
CAMERA_ID="" # Replace with actual camera ID from database

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   V380 CCTV PTZ Control - API Test Suite        ║${NC}"
echo -e "${BLUE}║   Testing ONVIF commands on port 8899           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}\n"

# Function to test PTZ command
test_ptz_command() {
  local command=$1
  local speed=$2
  
  echo -e "${BLUE}Testing: $command${NC}"
  
  response=$(curl -s -X POST "$BASE_URL/api/ptz/$CAMERA_ID/command" \
    -H "Content-Type: application/json" \
    -d "{\"command\": \"$command\", \"speed\": ${speed:-5}}")
  
  if echo "$response" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ $command executed${NC}"
  elif echo "$response" | grep -q "success.*false"; then
    echo -e "${RED}✗ $command failed${NC}"
    echo "   Response: $(echo $response | jq -r '.message')"
  else
    echo "   Response: $response"
  fi
  echo ""
}

# Check if camera ID is provided
if [ -z "$CAMERA_ID" ]; then
  echo -e "${RED}ERROR: CAMERA_ID not set${NC}"
  echo ""
  echo "Usage:"
  echo "1. Get camera ID from database:"
  echo "   db.cameras.findOne({ ipAddress: '192.168.1.2' })._id"
  echo ""
  echo "2. Set CAMERA_ID in this script"
  echo "3. Run: bash test-ptz-api.sh"
  exit 1
fi

echo -e "${BLUE}Camera ID: $CAMERA_ID${NC}\n"

# Test all PTZ commands
echo -e "${BLUE}=== Movement Commands ===${NC}\n"
test_ptz_command "up" 5
test_ptz_command "down" 5
test_ptz_command "left" 5
test_ptz_command "right" 5

echo -e "${BLUE}=== Zoom Commands ===${NC}\n"
test_ptz_command "zoom_in" 5
test_ptz_command "zoom_out" 5

echo -e "${BLUE}=== Special Commands ===${NC}\n"
test_ptz_command "stop" 0
test_ptz_command "home" 0

echo -e "${BLUE}=== Speed Testing ===${NC}\n"
echo -e "${BLUE}Testing UP with different speeds:${NC}"
test_ptz_command "up" 1
test_ptz_command "up" 10

echo -e "${GREEN}✓ PTZ API tests complete${NC}"
