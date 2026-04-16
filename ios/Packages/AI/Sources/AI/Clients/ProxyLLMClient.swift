import Foundation
import Networking
import Core

/**
 # ProxyLLMClient
 
 A generic LLM client that streams responses from a backend proxy server.
 Designed to work with any AI provider (OpenAI, Anthropic, etc.) through a secure backend proxy.
 
 ## Why Proxy Architecture?
 
 - **🔒 Security**: No API keys stored in the mobile app
 - **🔄 Flexibility**: Backend can switch providers without app updates
 - **🛡️ Rate Limiting**: Backend handles rate limiting and quotas
 - **📊 Analytics**: Backend can implement usage tracking and analytics
 
 ## Quick Usage
 
 ```swift
 let proxyClient = ProxyLLMClient(
     baseURL: URL(string: "https://your-proxy.example.com")!,
     httpClient: httpClient,
     path: "/v1/chat/stream"
 )
 
 let stream = proxyClient.streamResponse(messages: messages)
 for try await chunk in stream {
     print("Received: \(chunk)")
 }
 ```
 
 ## Environment Configuration
 
 Configure via environment variables in `CompositionRoot`:
 - `PROXY_BASE_URL`: Base URL of your proxy server
 - `PROXY_PATH`: API endpoint path (default: "/v1/chat/stream")  
 - `PROXY_DEFAULT_HEADERS`: JSON string with additional headers
 
 **Further reading → README**: See `Packages/AI/README.md` for complete operational details, endpoint contracts, and backend requirements.
 */
public final class ProxyLLMClient: LLMClient, @unchecked Sendable {
    
    private let baseURL: URL
    private let httpClient: HTTPClient
    private let path: String
    private let defaultHeaders: [String: String]
    
    /**
     Creates a new ProxyLLMClient instance.
     
     ## Parameters
     
     - **baseURL**: The base URL of your proxy server (e.g., `https://api.yourdomain.com`)
     - **httpClient**: An HTTP client instance for making network requests (typically `URLSessionHTTPClient`)
     - **path**: The API endpoint path for chat streaming (default: `"/v1/chat/stream"`)
     - **defaultHeaders**: Additional headers to include with every request (useful for API keys, user IDs, etc.)
     
     ## Example
     
     ```swift
     let httpClient = URLSessionHTTPClient(baseURL: baseURL)
     let proxyClient = ProxyLLMClient(
         baseURL: URL(string: "https://your-proxy.example.com")!,
         httpClient: httpClient,
         path: "/v1/chat/stream",
         defaultHeaders: [
             "Authorization": "Bearer your-backend-token",
             "X-User-ID": "user123"
         ]
     )
     ```
     
     ## Important Notes
     
     - The `baseURL` should point to your secure proxy server, not directly to AI provider APIs
     - The `httpClient` should be configured with appropriate interceptors (auth, retry, etc.)
     - `defaultHeaders` are merged with request-specific headers and can be overridden per request
     */
    public init(
        baseURL: URL,
        httpClient: HTTPClient,
        path: String = "/v1/chat/stream",
        defaultHeaders: [String: String] = [:]
    ) {
        self.baseURL = baseURL
        self.httpClient = httpClient
        self.path = path
        self.defaultHeaders = defaultHeaders
    }
    
    /**
     Streams a response from the LLM based on conversation history.
     
     This method sends a POST request to the proxy server and streams the response back
     using Server-Sent Events (SSE) format. The response is parsed and yielded as text chunks.
     
     ## Parameters
     
     - **messages**: Array of conversation messages in chronological order. Each message should have:
       - `role`: Either "user", "assistant", or "system"
       - `content`: The actual message text
     - **model**: Optional model identifier (e.g., "gpt-4", "gpt-3.5-turbo", "claude-3"). 
       Defaults to "default" if not specified.
     - **temperature**: Optional temperature for response generation (0.0 to 2.0).
       Lower values are more deterministic, higher values are more creative.
       Defaults to 0.2 if not specified.
     
     ## Returns
     
     An `AsyncThrowingStream<String, Error>` that yields text chunks as they arrive from the server.
     The stream completes when the server sends `[DONE]` or encounters an error.
     
     ## Usage Example
     
     ```swift
     let messages = [
         LLMMessage(role: "system", content: "You are a helpful assistant."),
         LLMMessage(role: "user", content: "What is the capital of France?")
     ]
     
     let stream = proxyClient.streamResponse(
         messages: messages,
         model: "gpt-4",
         temperature: 0.7
     )
     
     do {
         for try await chunk in stream {
             // Process each chunk as it arrives
             print("Received: \(chunk)")
         }
         print("Stream completed successfully")
     } catch {
         print("Stream failed: \(error)")
     }
     ```
     
     ## Error Handling
     
     The stream can throw various `AppError` types:
     - `AppError.server`: HTTP errors (4xx/5xx status codes)
     - `AppError.network`: Network connectivity issues
     - `AppError.decoding`: Response parsing errors
     
     ## Cancellation
     
     The stream respects Swift's structured concurrency cancellation.
     If the consuming task is cancelled, the underlying HTTP request is automatically cancelled.
     */
    public func streamResponse(
        messages: [LLMMessage],
        model: String? = nil,
        temperature: Double? = nil
    ) -> AsyncThrowingStream<String, Error> {
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    // Build the request
                    let request = try await buildRequest(
                        messages: messages,
                        model: model,
                        temperature: temperature
                    )
                    
                    // Log the request (redact sensitive headers)
                    let logURLString = self.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                        + "/"
                        + self.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                    AppLogger.debug(
                        "LLM request: \(request.method.rawValue) \(logURLString)",
                        category: AppLogger.ai
                    )
                    
                    // Send the request
                    let response = try await httpClient.send(request)
                    
                    // Handle the response
                    try await handleResponse(response, continuation: continuation)
                    
                } catch {
                    // Map network errors to AppError
                    let appError = AppError.from(error)
                    AppLogger.error(
                        "LLM request failed: \(AppLogger.redacted(appError.userMessage))",
                        category: AppLogger.ai
                    )
                    continuation.finish(throwing: appError)
                }
            }
        }
    }
    
    // MARK: - Request Building
    
    /**
     Builds an HTTP request for the chat streaming endpoint.
     
     Creates a POST request with the following structure:
     - URL: `baseURL + path`
     - Method: POST
     - Headers: Accept (text/event-stream), Content-Type (application/json), plus defaultHeaders
     - Body: JSON-encoded chat request with messages, model, and temperature
     
     ## Parameters
     - messages: Conversation history to send to the LLM
     - model: AI model identifier (defaults to "default")
     - temperature: Response creativity setting (defaults to 0.2)
     
     ## Returns
     A configured HTTPRequest ready to be sent via the HTTPClient
     
     ## Throws
     - JSON encoding errors if the request body cannot be serialized
     */
    private func buildRequest(
        messages: [LLMMessage],
        model: String?,
        temperature: Double?
    ) async throws -> HTTPRequest {
        // Build the request body
        let requestBody = ChatStreamRequest(
            model: model ?? "default",
            messages: messages.map { message in
                ChatMessage(
                    role: message.role,
                    content: message.content
                )
            },
            temperature: temperature ?? 0.2
        )
        
        let bodyData = try JSONEncoder().encode(requestBody)
        
        // Build headers
        var headers = self.defaultHeaders
        headers["Accept"] = "text/event-stream"
        headers["Content-Type"] = "application/json"
        
        // Create the request
        return HTTPRequest(
            path: self.path,
            method: .post,
            headers: headers,
            body: bodyData
        )
    }
    
    // MARK: - Response Handling
    
    /**
     Handles the HTTP response from the proxy server.
     
     This method:
     1. Checks for task cancellation
     2. Validates HTTP status codes (200-299 range)
     3. Parses the response body as Server-Sent Events (SSE)
     4. Yields text chunks and handles completion signals
     
     ## Parameters
     - response: The HTTP response received from the proxy server
     - continuation: The stream continuation for yielding chunks and errors
     
     ## Behavior
     - **Success (200-299)**: Parses SSE format and yields chunks
     - **Client/Server Error (4xx/5xx)**: Throws AppError.server with status code
     - **Cancellation**: Gracefully finishes the stream without error
     */
    private func handleResponse(
        _ response: HTTPResponse,
        continuation: AsyncThrowingStream<String, Error>.Continuation
    ) async throws {
        // Check for cancellation
        if Task.isCancelled {
            continuation.finish()
            return
        }
        
        // Check response status
        guard (200...299).contains(response.statusCode) else {
            let error = AppError.server(
                code: response.statusCode,
                message: "LLM request failed with status \(response.statusCode)"
            )
            AppLogger.error(
                "LLM server error: \(response.statusCode)",
                category: AppLogger.ai
            )
            continuation.finish(throwing: error)
            return
        }
        
        // Parse SSE-style response
        try await parseSSEResponse(response.data, continuation: continuation)
    }
    
    /**
     Parses Server-Sent Events (SSE) format from response data.
     
     This method handles the SSE format used by OpenRouter and compatible APIs:
     ```
     data: {"choices":[{"delta":{"content":"Hello"}}]}
     data: {"choices":[{"delta":{"content":" there"}}]}
     data: [DONE]
     ```
     
     ## SSE Format Rules
     - Lines starting with `data:` contain JSON or completion signal
     - JSON format: `{"choices":[{"delta":{"content":"text"}}]}`
     - Empty lines are ignored
     - `[DONE]` signals stream completion
     - Other lines (event:, id:, etc.) are ignored
     
     ## Parameters
     - data: Raw response data from the HTTP response
     - continuation: Stream continuation for yielding chunks and errors
     
     ## Behavior
     - **Text chunks**: Parses JSON and yields content from delta
     - **Completion**: Finishes stream when `[DONE]` is encountered
     - **Cancellation**: Respects task cancellation and finishes gracefully
     - **Errors**: Throws AppError.decoding for invalid UTF-8 or malformed JSON
     
     ## Robustness Features
     - Handles both `data:` and `data: ` (with space) prefixes
     - Safely parses JSON and extracts content
     - Ignores malformed JSON lines (logs warning in debug)
     - Checks for cancellation on each line iteration
     */
    private func parseSSEResponse(
        _ data: Data,
        continuation: AsyncThrowingStream<String, Error>.Continuation
    ) async throws {
        guard let responseText = String(data: data, encoding: .utf8) else {
            let error = AppError.decoding
            continuation.finish(throwing: error)
            return
        }
        
        let lines = responseText.components(separatedBy: .newlines)
        
        for line in lines {
            // Check for cancellation
            if Task.isCancelled {
                continuation.finish()
                return
            }
            
            // Parse SSE data lines (accept both "data:" and "data: ")
            if line.hasPrefix("data:") {
                let content = line.dropFirst("data:".count)
                    .trimmingCharacters(in: .whitespaces)
                
                // Check for completion signal
                if content == "[DONE]" {
                    continuation.finish()
                    return
                }
                
                // Skip empty lines
                if content.isEmpty {
                    continue
                }
                
                // Try to parse as JSON (OpenRouter format)
                if let jsonData = content.data(using: .utf8),
                   let json = try? JSONDecoder().decode(OpenRouterChunk.self, from: jsonData),
                   let deltaContent = json.choices.first?.delta.content,
                   !deltaContent.isEmpty {
                    continuation.yield(deltaContent)
                } else {
                    // Fallback: treat as plain text (for backwards compatibility)
                    continuation.yield(content)
                }
            }
        }
        
        // Finish the stream if we reach the end without [DONE]
        continuation.finish()
    }
}

// MARK: - Request/Response Models

/**
 Request model for chat streaming API calls.
 
 This structure defines the JSON payload sent to the proxy server.
 It follows the OpenAI Chat Completions API format for maximum compatibility.
 */
private struct ChatStreamRequest: Codable {
    /// The AI model identifier (e.g., "gpt-4", "gpt-3.5-turbo", "claude-3")
    let model: String
    
    /// Array of conversation messages in chronological order
    let messages: [ChatMessage]
    
    /// Temperature setting for response generation (0.0 to 2.0)
    let temperature: Double
}

/**
 Message model for individual chat messages.
 
 Represents a single message in the conversation history.
 Each message has a role (user/assistant/system) and content.
 */
private struct ChatMessage: Codable {
    /// The role of the message sender ("user", "assistant", or "system")
    let role: String
    
    /// The actual message content/text
    let content: String
}

/**
 OpenRouter SSE chunk format.
 
 Represents a single streaming chunk from OpenRouter API.
 Format: {"choices":[{"delta":{"content":"text"}}]}
 */
private struct OpenRouterChunk: Codable {
    let choices: [OpenRouterChoice]
}

private struct OpenRouterChoice: Codable {
    let delta: OpenRouterDelta
}

private struct OpenRouterDelta: Codable {
    let content: String?
}

// MARK: - Legacy Protocol Support

/**
 Extension to support the original LLMClient protocol signature.
 
 This provides backward compatibility for code that uses the simpler
 `streamResponse(messages:)` method without model or temperature parameters.
 */
extension ProxyLLMClient {
    /**
     Legacy method for streaming responses with default parameters.
     
     This method calls the main `streamResponse` method with default values:
     - model: nil (uses "default")
     - temperature: nil (uses 0.2)
     
     ## Parameters
     - messages: Conversation history as an array of LLMMessage objects
     
     ## Returns
     AsyncThrowingStream yielding text chunks as they arrive
     */
    public func streamResponse(messages: [LLMMessage]) -> AsyncThrowingStream<String, Error> {
        return streamResponse(messages: messages, model: nil, temperature: nil)
    }
}
