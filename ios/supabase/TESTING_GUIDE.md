# Testing Guide: Supabase + OpenRouter Integration

This guide will help you test the complete migration from Cloudflare Workers to Supabase Edge Functions + OpenRouter.

## Pre-Testing Checklist

Before testing, ensure you've completed:

- [ ] Deployed Edge Function to Supabase (`supabase functions deploy ai`)
- [ ] Set OpenRouter API key secret
- [ ] Added credits to OpenRouter account
- [ ] Updated `Config/Secrets.xcconfig` with correct values
- [ ] Built the app successfully (no compile errors)

## Testing Phases

### Phase 1: Edge Function Direct Test

Test the Edge Function independently before testing from the app.

#### 1.1 Get a Test JWT Token

**Option A: From Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Find a test user or create one
3. Click the user → Copy "JWT Token" from the panel

**Option B: From your app**
1. Sign in to the app
2. Add logging in `CompositionRoot` to print the token:
   ```swift
   // Temporary debug code
   Task {
       if let token = try? await keychainStore.retrieve(key: .authAccessToken) {
           print("🔑 Auth Token: \(token)")
       }
   }
   ```
3. Copy the token from Xcode console

#### 1.2 Test with curl

```bash
export SUPABASE_JWT="YOUR_JWT_TOKEN"
export PROJECT_REF="YOUR_PROJECT_REF"

curl -N -X POST https://$PROJECT_REF.supabase.co/functions/v1/ai \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Say hi!"}
    ],
    "temperature": 0.7
  }'
```

**Expected Result:**
```
data: {"choices":[{"delta":{"content":"Hi"}}]}
data: {"choices":[{"delta":{"content":"! How"}}]}
data: {"choices":[{"delta":{"content":" can I help you?"}}]}
data: [DONE]
```

**If you get errors:**
- `401 Unauthorized`: JWT token is invalid or expired
- `500 Internal Server Error`: Check Edge Function logs
- `OpenRouter API key not configured`: Set the secret
- `No credits`: Add credits to OpenRouter account

#### 1.3 Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions** → **ai** → **Logs**
3. Look for:
   - ✅ "Function invoked successfully"
   - ✅ No error messages
   - ❌ Any errors or warnings

### Phase 2: iOS App Integration Test

Now test from the actual iOS app.

#### 2.1 Configure App

**Verify `Config/Secrets.xcconfig`:**
```bash
SUPABASE_URL = https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY = eyJ...
PROXY_BASE_URL = https://YOUR-PROJECT-REF.supabase.co/functions/v1
PROXY_PATH = /ai
```

**Clean and rebuild:**
```bash
# In Xcode
⌘ + Shift + K  # Clean
⌘ + B          # Build
```

#### 2.2 Check LLM Client Initialization

Add logging to verify correct client is being used:

1. Open Xcode console
2. Build and run the app
3. Look for log message:
   ```
   LLM provider: ProxyLLMClient (url=https://YOUR-REF.supabase.co/functions/v1, path=/ai)
   ```

**If you see "LLM provider: EchoLLMClient":**
- Check that `PROXY_BASE_URL` is set in `Secrets.xcconfig`
- Clean build folder and rebuild
- Verify xcconfig is being included

#### 2.3 Test Authentication

1. Launch the app
2. Sign in (or sign up)
3. Verify you reach the main screen

**Check logs for:**
```
✅ "User authenticated, showing main"
✅ "Auth token stored" or similar
❌ Any auth errors
```

#### 2.4 Test Chat Functionality

**Basic Chat Test:**
1. Tap "New Chat" or similar
2. Type a simple message: "Hello!"
3. Send the message

**Expected Behavior:**
- ✅ Message appears in chat
- ✅ Streaming response starts within 1-2 seconds
- ✅ Response appears word-by-word (streaming)
- ✅ Response completes with no errors

**Check Xcode Console:**
```
✅ LLM request: POST https://YOUR-REF.supabase.co/functions/v1/ai
✅ No error messages
✅ Stream completes successfully
```

#### 2.5 Test Different Models

Try different OpenRouter models to ensure flexibility:

**Update the model in code** (temporarily for testing):

```swift
// In ChatViewModel.swift, find streamResponse call
let stream = llmClient.streamResponse(
    messages: messages,
    model: "anthropic/claude-3.7-sonnet",  // Change this
    temperature: 0.7
)
```

**Test these models:**
- [ ] `openai/gpt-4o-mini` (fast, cheap)
- [ ] `anthropic/claude-3.7-sonnet` (high quality)
- [ ] `google/gemini-2.5-pro` (Google's latest)

**Verify:**
- All models work
- Responses are appropriate for each model
- No errors in console or UI

#### 2.6 Test Error Handling

**Test invalid model:**
```swift
model: "invalid/model-name"
```
- Should show error message to user
- Should not crash

**Test while offline:**
1. Turn on Airplane Mode
2. Try to send a message
- Should show network error
- Should not crash

**Test auth expiration:**
1. Wait for JWT to expire (~1 hour)
2. Try to send a message
- Should refresh token automatically
- Or prompt to sign in again

### Phase 3: Performance & Cost Testing

#### 3.1 Measure Latency

**Test response times:**
1. Send a message
2. Note time to first token (TTFT)
3. Note total response time

**Expected latencies:**
- TTFT: ~500ms-2s (depending on model)
- Full response: ~3-10s (depending on length)

**If too slow:**
- Try faster models (gpt-4o-mini, gemini-flash)
- Check your internet connection
- View latency in OpenRouter dashboard

#### 3.2 Monitor Costs

**OpenRouter Dashboard:**
1. Go to [openrouter.ai/activity](https://openrouter.ai/activity)
2. View recent requests
3. Check costs per request

**Typical costs:**
- Short message (100 tokens): $0.00001-0.0002
- Long message (1000 tokens): $0.0001-0.002

**Set spending alerts:**
1. Go to OpenRouter Settings
2. Set daily/monthly limits
3. Add email notifications

#### 3.3 Load Testing (Optional)

Send multiple rapid messages to test:
- Concurrent request handling
- Rate limiting behavior
- Cost scaling

### Phase 4: Production Readiness

#### 4.1 Security Checklist

- [ ] No API keys hardcoded in app
- [ ] Secrets set in Supabase (not exposed)
- [ ] JWT verification enabled in Edge Function
- [ ] HTTPS only (no HTTP endpoints)
- [ ] Row Level Security (RLS) enabled in Supabase

#### 4.2 Monitoring Setup

**Supabase:**
- [ ] Edge Function logs reviewed
- [ ] No recurring errors
- [ ] Reasonable invocation counts

**OpenRouter:**
- [ ] Usage dashboard reviewed
- [ ] Spending limits configured
- [ ] Credits sufficient for expected usage

**iOS App:**
- [ ] No crashes in Xcode console
- [ ] Proper error handling
- [ ] Good user experience

#### 4.3 Documentation Review

- [ ] README updated
- [ ] Deployment guide reviewed
- [ ] Configuration files documented
- [ ] Troubleshooting steps clear

## Common Issues & Solutions

### "LLM provider: EchoLLMClient"

**Problem:** App is using echo client instead of proxy client.

**Solution:**
1. Check `PROXY_BASE_URL` is set in `Secrets.xcconfig`
2. Clean build folder (⌘ + Shift + K)
3. Rebuild and verify in logs

### "Unauthorized" Error

**Problem:** Edge Function can't verify authentication.

**Solution:**
1. Verify user is signed in
2. Check JWT token is being sent
3. Check Edge Function config: `verify_jwt = true`
4. View Edge Function logs for auth errors

### "OpenRouter API key not configured"

**Problem:** Edge Function can't access OpenRouter.

**Solution:**
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY
supabase secrets list  # Verify it's set
```

### No Streaming (All at Once)

**Problem:** Response appears all at once instead of streaming.

**Solution:**
1. Check Edge Function is forwarding stream
2. Verify `Accept: text/event-stream` header
3. Check iOS client is parsing SSE correctly

### High Latency

**Problem:** Responses take too long.

**Solution:**
1. Try faster models (gpt-4o-mini)
2. Check Edge Function location (should be near users)
3. View OpenRouter dashboard for provider latency
4. Consider enabling OpenRouter's automatic routing

## Success Criteria

✅ **All tests passing:**
- [ ] Edge Function deployed successfully
- [ ] Direct curl test works
- [ ] App uses ProxyLLMClient (not Echo)
- [ ] Authentication works
- [ ] Chat streaming works
- [ ] Multiple models work
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] Costs are reasonable
- [ ] Monitoring is set up

🎉 **Ready for production!**

## Next Steps

After all tests pass:

1. **Remove debug logging** from app
2. **Set default model** to your preferred choice
3. **Configure spending limits** in OpenRouter
4. **Test on real devices** (not just simulator)
5. **Beta test** with a few users
6. **Monitor** for the first few days
7. **Ship it!** 🚀

## Support Resources

- **Edge Function logs**: Supabase Dashboard → Edge Functions → ai → Logs
- **OpenRouter dashboard**: [openrouter.ai/activity](https://openrouter.ai/activity)
- **Supabase docs**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **OpenRouter docs**: [openrouter.ai/docs](https://openrouter.ai/docs)

Need help? Check the main README or open an issue!

