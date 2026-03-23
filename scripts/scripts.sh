#!/bin/bash

# Configuration
TYPES_FILE="lib/types.ts"
ENV_FILE=".env"
API_URL="https://openrouter.ai/api/v1/chat/completions"

# Color Codes for Styling
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo "--------------------------------------------------------"
echo -e "${BLUE}AiBoT - AI Endpoint Production Readiness Test${RESET}"
echo "--------------------------------------------------------"

# 1. Check for Prerequisites
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found.${RESET}"
    exit 1
fi

if [ ! -f "$TYPES_FILE" ]; then
    echo -e "${RED}Error: $TYPES_FILE not found.${RESET}"
    exit 1
fi

# 2. Extract API Key
# This handles both OPENROUTER_API_KEY="key" and OPENROUTER_API_KEY=key
API_KEY=$(grep "^OPENROUTER_API_KEY=" "$ENV_FILE" | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: OPENROUTER_API_KEY not found in $ENV_FILE.${RESET}"
    exit 1
fi

echo -e "${GREEN}Found API Key in .env.${RESET}"

# 3. Extract Models from types.ts
# Matches id: "provider/model:free"
MODELS=$(grep 'id: "' "$TYPES_FILE" | sed 's/.*id: "\(.*\)".*/\1/')

if [ -z "$MODELS" ]; then
    echo -e "${RED}Error: No models found in $TYPES_FILE.${RESET}"
    exit 1
fi

echo -e "${GREEN}Successfully parsed models from types.ts.${RESET}"
echo "--------------------------------------------------------"

# 4. Testing Phase
SUCCESS_COUNT=0
FAILURE_COUNT=0
TOTAL_MODELS=0

# Create a temporary log file for results summary
LOG_FILE="/tmp/aibot_test_$(date +%s).log"
touch "$LOG_FILE"

for MODEL_ID in $MODELS; do
    TOTAL_MODELS=$((TOTAL_MODELS + 1))
    echo -en "[Test $((TOTAL_MODELS))] Model: ${YELLOW}$MODEL_ID${RESET} ... "
    
    # Send Request
    RESPONSE=$(curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -H "HTTP-Referer: https://aibot.local" \
        -H "X-Title: AiBoT Test Script" \
        -d '{
            "model": "'"$MODEL_ID"'",
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 10
        }' --max-time 15)
    
    # Analyze Response
    # Check for direct completion or choices
    if echo "$RESPONSE" | grep -q "\"choices\""; then
        echo -e "${GREEN}SUCCESS${RESET}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "[PASS] $MODEL_ID" >> "$LOG_FILE"
    else
        # Extract error message if possible
        ERROR_MSG=$(echo "$RESPONSE" | sed -n 's/.*"message":"\([^"]*\)".*/\1/p')
        if [ -z "$ERROR_MSG" ]; then
            ERROR_MSG="Unknown Error / Timeout"
        fi
        echo -e "${RED}FAILED${RESET} (${ERROR_MSG:0:50}...)"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        echo "[FAIL] $MODEL_ID - $ERROR_MSG" >> "$LOG_FILE"
    fi
    # sleep 0.2
done

# 5. Final Report
echo "--------------------------------------------------------"
echo -e "${BLUE}PRODUCTION READINESS SUMMARY${RESET}"
echo "--------------------------------------------------------"
echo -e "Total Tested: $TOTAL_MODELS"
echo -e "Passed:       ${GREEN}$SUCCESS_COUNT${RESET}"
echo -e "Failed:       ${RED}$FAILURE_COUNT${RESET}"
echo "--------------------------------------------------------"

if [ $FAILURE_COUNT -eq 0 ]; then
    echo -e "${GREEN}ALL SYSTEMS NOMINAL. READY FOR PRODUCTION!${RESET}"
else
    echo -e "${YELLOW} WARNING: Some models are currently unreachable.${RESET}"
    echo "Check the following failed models:"
    grep "\[FAIL\]" "$LOG_FILE" | cut -d' ' -f2
fi
echo "--------------------------------------------------------"

# Cleanup
rm "$LOG_FILE"
