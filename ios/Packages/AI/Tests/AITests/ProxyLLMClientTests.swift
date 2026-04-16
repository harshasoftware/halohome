import XCTest
@testable import AI
import Networking
import Core

final class ProxyLLMClientTests: XCTestCase {
    
    private var mockHTTPClient: MockHTTPClient!
    private var client: ProxyLLMClient!
    private let baseURL = URL(string: "https://api.example.com")!
    
    override func setUp() {
        super.setUp()
        mockHTTPClient = MockHTTPClient()
        client = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: mockHTTPClient,
            path: "/v1/chat/stream"
        )
    }
    
    override func tearDown() {
        client = nil
        mockHTTPClient = nil
        super.tearDown()
    }
    
    // MARK: - Initialization Tests
    
    func testInit_withDefaultPath() {
        // Given/When
        let client = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: mockHTTPClient
        )
        
        // Then
        XCTAssertNotNil(client)
    }
    
    func testInit_withCustomPath() {
        // Given/When
        let client = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: mockHTTPClient,
            path: "/custom/endpoint"
        )
        
        // Then
        XCTAssertNotNil(client)
    }
    
    func testInit_withDefaultHeaders() {
        // Given/When
        let client = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: mockHTTPClient,
            defaultHeaders: ["X-API-Key": "test-key"]
        )
        
        // Then
        XCTAssertNotNil(client)
    }
    
    // MARK: - Streaming Success Tests
    
    func testStreamResponse_successfulResponse_yieldsChunks() async throws {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        let sseResponse = """
        data: {"choices":[{"delta":{"content":"Hello"}}]}
        data: {"choices":[{"delta":{"content":" there"}}]}
        data: [DONE]
        """.data(using: .utf8)!
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: sseResponse,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks.count, 2)
        XCTAssertEqual(chunks[0], "Hello")
        XCTAssertEqual(chunks[1], " there")
    }
    
    func testStreamResponse_withModel_includesModelInRequest() async throws {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: "data: [DONE]".data(using: .utf8)!,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(
            messages: messages,
            model: "gpt-4",
            temperature: 0.7
        )
        
        // Consume stream
        for try await _ in stream { }
        
        // Then
        XCTAssertEqual(mockHTTPClient.sentRequests.count, 1)
        let request = mockHTTPClient.sentRequests[0]
        
        // Verify request body contains model
        if let body = request.body,
           let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any] {
            XCTAssertEqual(json["model"] as? String, "gpt-4")
            XCTAssertEqual(json["temperature"] as? Double, 0.7)
        } else {
            XCTFail("Request body should contain model and temperature")
        }
    }
    
    func testStreamResponse_withoutModel_usesDefault() async throws {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: "data: [DONE]".data(using: .utf8)!,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        
        // Consume stream
        for try await _ in stream { }
        
        // Then
        XCTAssertEqual(mockHTTPClient.sentRequests.count, 1)
        let request = mockHTTPClient.sentRequests[0]
        
        // Verify request body contains default model
        if let body = request.body,
           let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any] {
            XCTAssertEqual(json["model"] as? String, "default")
            XCTAssertEqual(json["temperature"] as? Double, 0.2)
        } else {
            XCTFail("Request body should contain default model and temperature")
        }
    }
    
    func testStreamResponse_legacyMethod_usesDefaults() async throws {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: "data: [DONE]".data(using: .utf8)!,
            requestID: nil
        )
        
        // When - Use legacy method without model/temperature
        let stream = client.streamResponse(messages: messages)
        
        // Consume stream
        for try await _ in stream { }
        
        // Then
        XCTAssertEqual(mockHTTPClient.sentRequests.count, 1)
        let request = mockHTTPClient.sentRequests[0]
        
        // Verify request body contains defaults
        if let body = request.body,
           let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any] {
            XCTAssertEqual(json["model"] as? String, "default")
            XCTAssertEqual(json["temperature"] as? Double, 0.2)
        }
    }
    
    func testStreamResponse_setsCorrectHeaders() async throws {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: "data: [DONE]".data(using: .utf8)!,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        
        // Consume stream
        for try await _ in stream { }
        
        // Then
        XCTAssertEqual(mockHTTPClient.sentRequests.count, 1)
        let request = mockHTTPClient.sentRequests[0]
        
        XCTAssertEqual(request.headers["Accept"], "text/event-stream")
        XCTAssertEqual(request.headers["Content-Type"], "application/json")
    }
    
    func testStreamResponse_withDefaultHeaders_mergesHeaders() async throws {
        // Given
        let customClient = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: mockHTTPClient,
            defaultHeaders: ["X-Custom": "value"]
        )
        
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: "data: [DONE]".data(using: .utf8)!,
            requestID: nil
        )
        
        // When
        let stream = customClient.streamResponse(messages: messages)
        
        // Consume stream
        for try await _ in stream { }
        
        // Then
        let request = mockHTTPClient.sentRequests[0]
        XCTAssertEqual(request.headers["X-Custom"], "value")
        XCTAssertEqual(request.headers["Accept"], "text/event-stream")
    }
    
    // MARK: - SSE Parsing Tests
    
    func testStreamResponse_emptyContent_skipsChunk() async throws {
        // Given - Only send non-empty content
        let messages = [LLMMessage(role: "user", content: "Hello")]
        let sseResponse = """
        data: {"choices":[{"delta":{"content":"Hello"}}]}
        data: {"choices":[{"delta":{"content":" world"}}]}
        data: [DONE]
        """.data(using: .utf8)!
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: sseResponse,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks.count, 2)
        XCTAssertEqual(chunks[0], "Hello")
        XCTAssertEqual(chunks[1], " world")
    }
    
    func testStreamResponse_multipleMessages_encodesCorrectly() async throws {
        // Given
        let messages = [
            LLMMessage(role: "system", content: "You are helpful"),
            LLMMessage(role: "user", content: "Hello"),
            LLMMessage(role: "assistant", content: "Hi there!")
        ]
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: "data: [DONE]".data(using: .utf8)!,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        
        // Consume stream
        for try await _ in stream { }
        
        // Then
        let request = mockHTTPClient.sentRequests[0]
        
        if let body = request.body,
           let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
           let messagesArray = json["messages"] as? [[String: String]] {
            XCTAssertEqual(messagesArray.count, 3)
            XCTAssertEqual(messagesArray[0]["role"], "system")
            XCTAssertEqual(messagesArray[0]["content"], "You are helpful")
            XCTAssertEqual(messagesArray[1]["role"], "user")
            XCTAssertEqual(messagesArray[1]["content"], "Hello")
            XCTAssertEqual(messagesArray[2]["role"], "assistant")
            XCTAssertEqual(messagesArray[2]["content"], "Hi there!")
        } else {
            XCTFail("Request body should contain messages array")
        }
    }
    
    func testStreamResponse_plainTextFallback_yieldsContent() async throws {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        let sseResponse = """
        data: Plain text chunk
        data: [DONE]
        """.data(using: .utf8)!
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: sseResponse,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks.count, 1)
        XCTAssertEqual(chunks[0], "Plain text chunk")
    }
    
    func testStreamResponse_dataWithSpace_parsesCorrectly() async throws {
        // Given - SSE format with space after "data:"
        let messages = [LLMMessage(role: "user", content: "Hello")]
        let sseResponse = """
        data: {"choices":[{"delta":{"content":"Hello"}}]}
        data: [DONE]
        """.data(using: .utf8)!
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: sseResponse,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks.count, 1)
        XCTAssertEqual(chunks[0], "Hello")
    }
    
    func testStreamResponse_emptyLines_ignored() async throws {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        let sseResponse = """
        data: {"choices":[{"delta":{"content":"Hello"}}]}
        
        data: {"choices":[{"delta":{"content":" there"}}]}
        
        data: [DONE]
        """.data(using: .utf8)!
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: sseResponse,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks.count, 2)
        XCTAssertEqual(chunks[0], "Hello")
        XCTAssertEqual(chunks[1], " there")
    }
    
    // MARK: - Error Handling Tests
    
    func testStreamResponse_serverError_throwsAppError() async {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 500,
            headers: [:],
            data: Data(),
            requestID: nil
        )
        
        // When/Then
        do {
            let stream = client.streamResponse(messages: messages)
            for try await _ in stream {
                XCTFail("Should not yield any chunks")
            }
            XCTFail("Should have thrown an error")
        } catch let error as AppError {
            if case .server(let code, _) = error {
                XCTAssertEqual(code, 500)
            } else {
                XCTFail("Expected AppError.server, got \(error)")
            }
        } catch {
            XCTFail("Expected AppError, got \(error)")
        }
    }
    
    func testStreamResponse_networkError_throwsAppError() async {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.shouldThrow = true
        mockHTTPClient.errorToThrow = URLError(.notConnectedToInternet)
        
        // When/Then
        do {
            let stream = client.streamResponse(messages: messages)
            for try await _ in stream {
                XCTFail("Should not yield any chunks")
            }
            XCTFail("Should have thrown an error")
        } catch let error as AppError {
            if case .network = error {
                // Success
            } else {
                XCTFail("Expected AppError.network, got \(error)")
            }
        } catch {
            XCTFail("Expected AppError, got \(error)")
        }
    }
    
    func testStreamResponse_invalidUTF8_throwsDecodingError() async {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        let invalidData = Data([0xFF, 0xFE, 0xFD]) // Invalid UTF-8
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: invalidData,
            requestID: nil
        )
        
        // When/Then
        do {
            let stream = client.streamResponse(messages: messages)
            for try await _ in stream {
                XCTFail("Should not yield any chunks")
            }
            XCTFail("Should have thrown an error")
        } catch let error as AppError {
            if case .decoding = error {
                // Success
            } else {
                XCTFail("Expected AppError.decoding, got \(error)")
            }
        } catch {
            XCTFail("Expected AppError, got \(error)")
        }
    }
    
    func testStreamResponse_401Error_throwsAppError() async {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 401,
            headers: [:],
            data: Data(),
            requestID: nil
        )
        
        // When/Then
        do {
            let stream = client.streamResponse(messages: messages)
            for try await _ in stream {
                XCTFail("Should not yield any chunks")
            }
            XCTFail("Should have thrown an error")
        } catch let error as AppError {
            if case .server(let code, _) = error {
                XCTAssertEqual(code, 401)
            } else {
                XCTFail("Expected AppError.server with 401, got \(error)")
            }
        } catch {
            XCTFail("Expected AppError, got \(error)")
        }
    }
    
    // MARK: - Cancellation Tests
    
    func testStreamResponse_cancellation_stopsStreaming() async {
        // Given
        let messages = [LLMMessage(role: "user", content: "Hello")]
        let sseResponse = """
        data: {"choices":[{"delta":{"content":"Hello"}}]}
        data: {"choices":[{"delta":{"content":" there"}}]}
        data: {"choices":[{"delta":{"content":" friend"}}]}
        data: [DONE]
        """.data(using: .utf8)!
        
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: sseResponse,
            requestID: nil
        )
        
        // When
        let stream = client.streamResponse(messages: messages)
        var chunks: [String] = []
        
        let task = Task {
            for try await chunk in stream {
                chunks.append(chunk)
                if chunks.count == 2 {
                    // Cancel after 2 chunks
                    return
                }
            }
        }
        
        try? await task.value
        task.cancel()
        
        // Then - Should have stopped early
        XCTAssertLessThanOrEqual(chunks.count, 2)
    }
    
    // MARK: - Request Path Tests
    
    func testStreamResponse_usesCorrectPath() async throws {
        // Given
        let customClient = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: mockHTTPClient,
            path: "/custom/stream"
        )
        
        let messages = [LLMMessage(role: "user", content: "Hello")]
        mockHTTPClient.mockResponse = HTTPResponse(
            statusCode: 200,
            headers: [:],
            data: "data: [DONE]".data(using: .utf8)!,
            requestID: nil
        )
        
        // When
        let stream = customClient.streamResponse(messages: messages)
        
        // Consume stream
        for try await _ in stream { }
        
        // Then
        XCTAssertEqual(mockHTTPClient.sentRequests.count, 1)
        let request = mockHTTPClient.sentRequests[0]
        XCTAssertEqual(request.path, "/custom/stream")
    }
}

// MARK: - Mock HTTP Client

private final class MockHTTPClient: HTTPClient, @unchecked Sendable {
    var mockResponse: HTTPResponse?
    var shouldThrow = false
    var errorToThrow: Error = URLError(.unknown)
    var sentRequests: [HTTPRequest] = []
    
    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        sentRequests.append(request)
        
        if shouldThrow {
            throw errorToThrow
        }
        
        guard let response = mockResponse else {
            throw URLError(.badServerResponse)
        }
        
        return response
    }
}

