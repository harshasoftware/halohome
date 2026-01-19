#!/bin/bash
# Deploy all Supabase Edge Functions
# Prerequisites: Run 'supabase login' first, or set SUPABASE_ACCESS_TOKEN

set -e  # Exit on error

PROJECT_REF="eypsystctqwvphvcrmxb"
FUNCTIONS=(
  "ai-subscription"
  "astro-ai-chat"
  "check-astro-premium"
  "city-info"
  "copilot-runtime"
  "create-astro-report-payment"
  "create-share-link"
  "entrance-detection"
  "generate-embedding"
  "get-share-data"
  "reconcile-payments"
  "search-flights"
  "send-report-email"
  "verify-astro-payment"
)

echo "🚀 Deploying ${#FUNCTIONS[@]} Supabase Edge Functions..."
echo ""

for func in "${FUNCTIONS[@]}"; do
  echo "📦 Deploying $func..."
  supabase functions deploy "$func" --project-ref "$PROJECT_REF" --yes
  echo "✅ $func deployed successfully"
  echo ""
done

echo "🎉 All functions deployed successfully!"
