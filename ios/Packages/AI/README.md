# AI Package

The AI package provides LLM client implementations for streaming AI responses. The primary client is `ProxyLLMClient`, which communicates with Supabase Edge Functions and OpenRouter to provide secure, flexible access to 500+ AI models.

## Overview

The AI package contains `LLMClient` protocol implementations, with `ProxyLLMClient` as the default provider. This client works with **Supabase Edge Functions** which proxy requests to **OpenRouter**, providing several key benefits:

- **🔒 Security**: No API keys stored in the mobile app (keys in Supabase secrets)
- **🔄 Flexibility**: Access 500+ models from 60+ providers through one API
- **📊 Analytics**: Built-in usage tracking via OpenRouter dashboard
- **🛡️ Authentication**: Automatic Supabase JWT verification
- **💰 Cost-effective**: OpenRouter pricing is 17-20% cheaper than direct provider APIs

## Endpoint Contract

### Supabase Edge Function Configuration
- **Base URL**: `https://YOUR-PROJECT-REF.supabase.co/functions/v1`
- **Path**: `/ai`
- **Method**: POST
- **Headers**: 
  - `Authorization: Bearer {supabase_jwt_token}` (automatic via auth interceptor)
  - `Content-Type: application/json`
  - `Accept: text/event-stream`

### Request JSON Shape

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    {
      "role": "user|assistant|system",
      "content": "..."
    }
  ],
  "temperature": 0.7
}
```

**Notes**:
- `model`: OpenRouter model identifier (e.g., "openai/gpt-4o", "anthropic/claude-3.7-sonnet")
- `messages`: Array in chronological order (oldest → newest)
- `temperature`: 0.0 to 2.0 (lower = deterministic, higher = creative)

### Streaming Format (SSE)

OpenRouter returns JSON chunks in SSE format:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" there"}}]}
data: [DONE]
```

**Notes**:
- Each `data:` line contains a JSON object with OpenAI-compatible format
- The client automatically parses the JSON and extracts `choices[0].delta.content`
- Falls back to plain text for backwards compatibility
- `[DONE]` signals stream completion

## Environment Wiring (CompositionRoot)

Configure the client via `Config/Secrets.xcconfig`:

```bash
# Supabase Edge Function Configuration
PROXY_BASE_URL = https://YOUR-PROJECT-REF.supabase.co/functions/v1
PROXY_PATH = /ai
```

**Notes**:
- `PROXY_BASE_URL` must be set to enable proxy mode; otherwise falls back to EchoLLMClient
- The auth token is automatically added via the `AuthInterceptor` from your Supabase session
- No need for `PROXY_DEFAULT_HEADERS` - authentication is handled automatically

### Setup Steps

1. **Deploy Edge Function** (see `supabase/DEPLOYMENT_GUIDE.md`):
   ```bash
   supabase functions deploy ai
   ```

2. **Update Config** in `Config/Secrets.xcconfig`:
   ```bash
   PROXY_BASE_URL = https://YOUR-PROJECT-REF.supabase.co/functions/v1
   PROXY_PATH = /ai
   ```

3. **Build and run** - Authentication is automatic!

## Quick Test with curl

Test your Supabase Edge Function directly:

```bash
# Get a JWT token from your app or Supabase Dashboard
export SUPABASE_JWT="your-jwt-token"

curl -N -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/ai \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello!"}],
    "temperature": 0.7
  }'
```

**Expected Output**:
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":"! How can I"}}]}
data: {"choices":[{"delta":{"content":" help you today?"}}]}
data: [DONE]
```

## Error Mapping Table

| Failure                   | Returned Error                                            |
| ------------------------- | --------------------------------------------------------- |
| Non-2xx status            | `AppError.server(code:…, message: "...")`                |
| Network timeout / offline | `AppError.network(underlying:)`                           |
| Invalid UTF-8             | `AppError.decoding`                                        |
| Cancellation              | Stream finishes without throwing                          |

## Security & Logging

### Security Best Practices
- **No API keys in app**: All keys live in the proxy server
- **Proxy-side redaction**: Implement request/response logging on proxy
- **Request tracing**: Pass through `X-Request-Id` for correlation

### Client Logging
- Client logs redact sensitive headers automatically
- Uses `AppLogger.ai` category for all AI-related logs
- Request URLs are logged for debugging (clean formatting)

## Timeouts & Backoff

### Client Behavior
- Client does not implement retry/backoff policies
- Relies on `Networking` layer interceptors if needed
- Respects Swift structured concurrency cancellation

### Recommended Proxy Implementation
- Implement rate limiting and quotas at proxy level
- Handle provider-specific retry logic
- Set appropriate timeouts for upstream AI providers
- Implement circuit breakers for provider failures

## Testing

The package includes comprehensive tests:
- **Unit tests**: `ProxyLLMClientTests.swift`
- **Network interception**: Uses `URLProtocolStub` for deterministic testing
- **Error scenarios**: Tests all error mapping paths
- **Cancellation**: Verifies proper cleanup on task cancellation

### Running Tests

```bash
# Run AI package tests
swift test --package-path Packages/AI

# Run all project tests
xcodebuild test -scheme CartoStar
```

## Backend Implementation (Supabase Edge Function)

The AI proxy is implemented as a Supabase Edge Function that:
1. Verifies Supabase authentication
2. Proxies requests to OpenRouter
3. Streams responses back to the client

See the implementation in `supabase/functions/ai/index.ts`

### Key Features

```typescript
// Automatic auth verification (configured in supabase/config.toml)
verify_jwt = true

// Proxies to OpenRouter
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openRouterApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    messages,
    temperature,
    stream: true,
  }),
})

// Streams response directly to client
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  },
})
```

### Deployment

```bash
# Deploy to Supabase
supabase functions deploy ai

# Set secrets
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
supabase secrets set APP_URL=https://your-app.com
```

See `supabase/DEPLOYMENT_GUIDE.md` for complete instructions.

## Integration with Chat

The `ProxyLLMClient` integrates seamlessly with the existing chat system:

1. **CompositionRoot**: Environment-gated client selection
2. **ChatViewModel**: Uses client via dependency injection
3. **Streaming**: Real-time response updates in UI
4. **Error Handling**: User-friendly error messages

## Available Models (OpenRouter)

Access any of these models by changing the `model` parameter:

### Popular Models

| Model ID | Provider | Best For | Cost/1M tokens |
|----------|----------|----------|----------------|
| `openai/gpt-4o` | OpenAI | General purpose | $2.00 |
| `openai/gpt-4o-mini` | OpenAI | Fast & cheap | $0.12 |
| `anthropic/claude-3.7-sonnet` | Anthropic | Long context | $2.50 |
| `google/gemini-2.5-pro` | Google | Multimodal | $1.25 |
| `meta-llama/llama-3.3-70b` | Meta | Open source | $0.60 |
| `deepseek/deepseek-chat` | DeepSeek | Chinese context | $0.14 |

See full list: [openrouter.ai/models](https://openrouter.ai/models)

## Troubleshooting

### Common Issues

**"LLM provider: EchoLLMClient"**
- Check that `PROXY_BASE_URL` is set in `Config/Secrets.xcconfig`
- Verify the URL matches your Supabase project: `https://YOUR-REF.supabase.co/functions/v1`

**"Unauthorized" errors**
- Ensure user is signed in to Supabase
- Check that auth token is being sent (automatic via `AuthInterceptor`)
- Verify Edge Function JWT verification is enabled

**"OpenRouter API key not configured"**
- Set the secret in Supabase: `supabase secrets set OPENROUTER_API_KEY=...`
- Verify with: `supabase secrets list`

**No AI responses**
- Check OpenRouter account has credits ([openrouter.ai](https://openrouter.ai))
- View Edge Function logs in Supabase Dashboard
- Test Edge Function directly with curl (see above)

**JSON parsing errors**
- The client automatically handles both JSON and plain text responses
- Check Edge Function logs for any streaming errors

### Debug Logging

Enable debug logging to troubleshoot issues:

```swift
// In CompositionRoot, the client logs request details:
AppLogger.debug("LLM request: POST https://your-proxy.com/v1/chat/stream", category: .ai)
```

Check the console for:
- Request URLs and methods
- Response status codes
- Error details (with PII redacted)
