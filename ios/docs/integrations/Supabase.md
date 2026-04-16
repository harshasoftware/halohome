# Supabase Setup & Deployment

Complete guide for setting up Supabase Auth and deploying the AI Edge Function.

## Prerequisites

- [Supabase](https://supabase.com) account (free tier works)
- [OpenRouter](https://openrouter.ai) account with credits
- Supabase CLI installed

## Step 1: Install Supabase CLI

**macOS:**
```bash
brew install supabase/tap/supabase
```

**npm:**
```bash
npm install -g supabase
```

**Verify:**
```bash
supabase --version
# Should show version 1.x.x
```

## Step 2: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose organization or create one
4. Fill in:
   - Name: `my-ai-app`
   - Database Password: (Generate strong password)
   - Region: (Choose closest to users)
5. Click "Create new project"
6. Wait 2-3 minutes for provisioning

## Step 3: Get Project Credentials

In your Supabase dashboard:

1. Go to **Project Settings** (gear icon)
2. Navigate to **API** section
3. Copy these values:

```bash
# Project URL
https://abcdefghijklmnop.supabase.co

# Project Reference ID (from URL or Settings → General)
abcdefghijklmnop

# Anon Public Key (starts with eyJ...)
eyJhbGci...
```

## Step 4: Enable Authentication

### Email Authentication

1. Go to **Authentication** → **Providers**
2. Find **Email** provider
3. Toggle **Enable Email provider** ON
4. **Enable email confirmations:** OFF (for development)
5. Click **Save**

### Apple Sign In (Recommended)

1. Go to **Authentication** → **Providers**
2. Find **Apple** provider
3. Toggle **Enable Sign in with Apple** ON
4. Configure:
   - **Apple App ID**: `com.yourcompany.yourapp`
   - **Apple Team ID**: Found in Apple Developer → Membership
   - **Apple Key ID**: Create in Keys section
   - **Apple Private Key**: Download .p8 file, paste contents
5. Click **Save**

**Apple Developer setup:**
- Go to [developer.apple.com/account](https://developer.apple.com/account)
- Certificates, Identifiers & Profiles → Keys
- Create new key with "Sign in with Apple" enabled
- Download .p8 file (only one chance!)
- Note Key ID

## Step 5: Link Local Project

In your project directory:

```bash
cd /path/to/CartoStar

# Login
supabase login
# Opens browser for authentication

# Link project
supabase link --project-ref YOUR_PROJECT_REF
# Replace YOUR_PROJECT_REF with your project ID
```

**Expected output:**
```
Linked to project: YOUR_PROJECT_REF
```

## Step 6: Get OpenRouter API Key

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up or sign in
3. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
4. Click "Create Key"
5. Name it: `my-ai-app`
6. Copy key (starts with `sk-or-v1-...`)

**Add credits:**
- Go to Settings → Billing
- Add credits ($5 minimum, lasts a while)
- No subscription needed

## Step 7: Set Edge Function Secrets

```bash
# Set OpenRouter API key
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE

# Set app URL (optional, for OpenRouter attribution)
supabase secrets set APP_URL=https://your-app.com
```

**Verify secrets:**
```bash
supabase secrets list
```

**Expected output:**
```
┌──────────────────────┬────────────────────┐
│ Name                 │ Value              │
├──────────────────────┼────────────────────┤
│ OPENROUTER_API_KEY   │ sk-or-v1-***       │
│ APP_URL              │ https://your-ap*** │
└──────────────────────┴────────────────────┘
```

## Step 8: Deploy Edge Function

```bash
# Deploy AI function
supabase functions deploy ai
```

**Expected output:**
```
Deploying function ai...
Deployed function ai (deployed version: 1)
Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai
```

**Copy this URL!** You'll need it for the iOS app.

## Step 9: Configure iOS App

1. **Open** `Config/Secrets.xcconfig`
2. **Update** with your values:

```bash
// Supabase
SUPABASE_URL = https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY = eyJ...YOUR_ANON_KEY...

// RevenueCat (optional for now)
REVENUECAT_API_KEY = appl_YOUR_KEY
RC_ENTITLEMENT_ID = pro

// AI Proxy (Supabase Edge Function)
PROXY_BASE_URL = https://YOUR-PROJECT-REF.supabase.co/functions/v1
PROXY_PATH = /ai
```

3. **Clean build:** `⌘ + Shift + K` in Xcode
4. **Run app:** `⌘ + R`

## Step 10: Test the Setup

### Test Auth

1. Run app
2. Tap "Sign Up"
3. Enter email and password
4. Should sign in successfully
5. Check Supabase dashboard → Authentication → Users

### Test AI Proxy

**Via curl:**
```bash
# Get JWT token from app or Supabase dashboard
# (Dashboard → SQL Editor → Quick Start → Get JWT)

curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Say hello!"}
    ]
  }'
```

**Expected response:**
```
data: {"id":"chatcmpl-...","choices":[{"delta":{"content":"Hello"},"index":0}]}
data: {"id":"chatcmpl-...","choices":[{"delta":{"content":"!"},"index":0}]}
data: {"id":"chatcmpl-...","choices":[{"delta":{"content":" How"},"index":0}]}
...
data: [DONE]
```

### Test in App

1. Run app
2. Sign in
3. Start new chat
4. Type "Hello"
5. Should see streaming AI response

## Troubleshooting

### Issue: "Project not found" when linking

**Fixes:**
1. Check project ref is correct (from dashboard URL)
2. Ensure you're logged in: `supabase login`
3. Try: `supabase projects list` to see available projects

### Issue: "Unauthorized" when deploying function

**Fixes:**
1. Re-login: `supabase login`
2. Verify link: `supabase projects list` should show linked project
3. Check permissions in Supabase dashboard

### Issue: Edge Function returns 500

**Fixes:**
1. Check logs in dashboard:
   - Edge Functions → ai → Logs
2. Common causes:
   - OpenRouter API key not set
   - OpenRouter account has no credits
   - Invalid model name
3. Check secrets: `supabase secrets list`

### Issue: "Network Error" in app

**Fixes:**
1. Verify PROXY_BASE_URL is correct in Secrets.xcconfig
2. Check Edge Function is deployed: `supabase functions list`
3. Test with curl (see Step 10)
4. Check Supabase project is not paused (free tier pauses after 7 days inactivity)

### Issue: Auth fails with "Invalid API key"

**Fixes:**
1. Verify SUPABASE_URL and SUPABASE_ANON_KEY in Secrets.xcconfig
2. Check keys in dashboard: Project Settings → API
3. Use **Anon key**, not **Service key**
4. Clean build: `⌘ + Shift + K`

### Issue: Apple Sign In not working

**Fixes:**
1. Enable "Sign in with Apple" capability in Xcode:
   - Target → Signing & Capabilities
   - Add "Sign in with Apple"
2. Configure in Supabase dashboard (see Step 4)
3. Test on real device (simulator has limitations)
4. Check Apple Developer account is in good standing

### Issue: Function times out

**Fixes:**
1. Try faster model: `openai/gpt-4o-mini`
2. Check OpenRouter status: [status.openrouter.ai](https://status.openrouter.ai)
3. Increase timeout in Edge Function (see Function README)
4. Check network latency

## Updating the Function

Made changes to `supabase/functions/ai/index.ts`?

```bash
# Redeploy
supabase functions deploy ai
```

Changes are live immediately (no restart needed).

## Monitoring

### View Logs

**Dashboard:**
1. Go to Edge Functions → ai
2. Click **Logs** tab
3. Filter by time range
4. View request/response logs

**CLI:**
```bash
supabase functions logs ai
```

### Check Usage

**OpenRouter:**
- [openrouter.ai/activity](https://openrouter.ai/activity)
- View costs per model
- Set spending limits

**Supabase:**
- Dashboard → Organization → Billing
- Edge Functions usage
- Database usage

## Production Checklist

Before going live:

- [ ] Deployed Edge Function successfully
- [ ] Set OPENROUTER_API_KEY secret
- [ ] Added credits to OpenRouter account
- [ ] Enabled email confirmations in Auth settings
- [ ] Configured Apple Sign In (if using)
- [ ] Updated iOS app with production URLs
- [ ] Tested auth flow end-to-end
- [ ] Tested AI chat with streaming
- [ ] Checked Edge Function logs for errors
- [ ] Set up spending alerts in OpenRouter
- [ ] Documented which models you're using
- [ ] Upgraded to Supabase Pro ($25/mo recommended)

## Model Selection

Popular OpenRouter models:

| Model | Provider | Speed | Cost (per 1M tokens) | Best For |
|-------|----------|-------|----------------------|----------|
| `openai/gpt-4o-mini` | OpenAI | Fast | $0.12 | General purpose, development |
| `openai/gpt-4o` | OpenAI | Medium | $2.00 | Best quality |
| `anthropic/claude-3.7-sonnet` | Anthropic | Medium | $2.50 | Long context, analysis |
| `google/gemini-2.5-pro` | Google | Fast | $1.25 | Multimodal, latest |
| `meta-llama/llama-3.3-70b` | Meta | Fast | $0.60 | Open source, cost-effective |

**Change model:**
Edit in `supabase/functions/ai/index.ts` or pass from app.

## Cost Estimation

**Typical usage (1000 active users, 10 messages/day each):**

- Messages per month: 300,000
- Tokens per message: ~500 (input + output)
- Total tokens: 150M tokens/month

**With gpt-4o-mini ($0.12/1M):**
- Cost: $18/month

**With gpt-4o ($2.00/1M):**
- Cost: $300/month

**Plus:**
- Supabase Pro: $25/month
- Total: $43-325/month depending on model

**Optimize:**
- Use cheaper models for simple queries
- Limit conversation history sent to LLM
- Implement message rate limiting

## Related Docs

- [AI.md](../AI.md) - LLM client module
- [Auth.md](../Auth.md) - Authentication module
- [README.md](../../README.md) - Quick Start
- [Edge Function README](../../supabase/functions/ai/README.md) - Function details

---

**Questions?** Check logs first, then create an issue.

