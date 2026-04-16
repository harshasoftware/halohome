import XCTest
import Foundation
@testable import AI
@testable import Networking
@testable import Core

/// Tests for ProxyLLMClient streaming functionality
final class ProxyLLMClientTests: XCTestCase {
    
    private var client: ProxyLLMClient!
    private var baseURL: URL!
    private var httpClient: URLSessionHTTPClient!
    
    override func setUp() {
        super.setUp()
        baseURL = URL(string: "https://api.example.com")!
        
        // Create a custom URLSession with URLProtocolStub for testing
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [URLProtocolStub.self]
        let session = URLSession(configuration: config)
        
        httpClient = URLSessionHTTPClient(baseURL: baseURL, session: session)
        client = ProxyLLMClient(baseURL: baseURL, httpClient: httpClient)
    }
    
    override func tearDown() {
        URLProtocolStub.reset()
        super.tearDown()
    }
    
    // MARK: - Stream Chunks Tests
    
    func testStreamsChunks() async throws {
        // Given
        let testMessages = [
            LLMMessage(role: "user", content: "Hello"),
            LLMMessage(role: "assistant", content: "Hi there!")
        ]
        
        let responseBody = """
        data: Hello
        data:  World
        data: [DONE]
        """
        
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        URLProtocolStub.stub(
            url: endpointURL,
            data: responseBody.data(using: .utf8)!,
            statusCode: 200,
            headers: ["Content-Type": "text/event-stream"]
        )
        
        // When
        let stream = client.streamResponse(messages: testMessages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks, ["Hello", " World"])
        
        // Verify request was made correctly
        let capturedRequests = URLProtocolStub.capturedRequests()
        XCTAssertEqual(capturedRequests.count, 1)
        
        let request = try XCTUnwrap(capturedRequests.first)
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.url, endpointURL)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "text/event-stream")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
    }
    
    func testServerErrorMapping() async throws {
        // Given
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        
        URLProtocolStub.stub(
            url: endpointURL,
            data: Data(),
            statusCode: 500,
            headers: [:]
        )
        
        // When & Then
        let stream = client.streamResponse(messages: testMessages)
        
        do {
            for try await _ in stream {
                XCTFail("Expected error, but received chunk")
            }
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            switch error {
            case .server(let code, let message):
                XCTAssertEqual(code, 500)
                XCTAssertTrue(message?.contains("500") == true)
            default:
                XCTFail("Expected server error, got: \(error)")
            }
        }
    }
    
    func testRequestShape() async throws {
        // Given
        let testMessages = [
            LLMMessage(role: "user", content: "Hello"),
            LLMMessage(role: "assistant", content: "Hi!")
        ]
        
        let responseBody = "data: [DONE]\n"
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        
        URLProtocolStub.stub(
            url: endpointURL,
            data: responseBody.data(using: .utf8)!,
            statusCode: 200
        )
        
        // When
        let stream = client.streamResponse(messages: testMessages)
        for try await _ in stream {
            // Consume stream
        }
        
        // Then
        let capturedRequests = URLProtocolStub.capturedRequests()
        XCTAssertEqual(capturedRequests.count, 1)
        
        let request = try XCTUnwrap(capturedRequests.first)
        
        // Verify method and path
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.url, endpointURL)
        
        // Verify headers
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "text/event-stream")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        
        // Verify JSON body
        let bodyData = try XCTUnwrap(request.httpBody)
        let requestBody = try JSONDecoder().decode(ChatStreamRequest.self, from: bodyData)
        
        XCTAssertEqual(requestBody.model, "default")
        XCTAssertEqual(requestBody.temperature, 0.2)
        XCTAssertEqual(requestBody.messages.count, 2)
        XCTAssertEqual(requestBody.messages[0].role, "user")
        XCTAssertEqual(requestBody.messages[0].content, "Hello")
        XCTAssertEqual(requestBody.messages[1].role, "assistant")
        XCTAssertEqual(requestBody.messages[1].content, "Hi!")
    }
    
    func testCancellation() async throws {
        // Given
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let responseBody = """
        data: This is a long response
        data: that should be cancelled
        data: before completion
        data: [DONE]
        """
        
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        URLProtocolStub.stub(
            url: endpointURL,
            data: responseBody.data(using: .utf8)!,
            statusCode: 200
        )
        
        // When
        let stream = client.streamResponse(messages: testMessages)
        
        // Start consuming the stream and cancel early
        let task = Task {
            var chunks: [String] = []
            for try await chunk in stream {
                chunks.append(chunk)
                // Cancel after first chunk
                if chunks.count == 1 {
                    break
                }
            }
            return chunks
        }
        
        // Give it a moment to start processing
        try await Task.sleep(nanoseconds: 100_000) // 0.1ms
        
        // Cancel the task
        task.cancel()
        
        // Wait for completion (should not crash)
        let chunks = try await task.value
        XCTAssertLessThanOrEqual(chunks.count, 1)
    }
    
    func testCustomModelAndTemperature() async throws {
        // Given
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let responseBody = "data: [DONE]\n"
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        
        URLProtocolStub.stub(
            url: endpointURL,
            data: responseBody.data(using: .utf8)!,
            statusCode: 200
        )
        
        // When
        let stream = client.streamResponse(
            messages: testMessages,
            model: "gpt-4",
            temperature: 0.8
        )
        
        for try await _ in stream {
            // Consume stream
        }
        
        // Then
        let capturedRequests = URLProtocolStub.capturedRequests()
        let request = try XCTUnwrap(capturedRequests.first)
        let bodyData = try XCTUnwrap(request.httpBody)
        let requestBody = try JSONDecoder().decode(ChatStreamRequest.self, from: bodyData)
        
        XCTAssertEqual(requestBody.model, "gpt-4")
        XCTAssertEqual(requestBody.temperature, 0.8)
    }
    
    func testDefaultHeaders() async throws {
        // Given
        let customHeaders = ["Authorization": "Bearer token123", "X-Custom": "value"]
        let customClient = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: httpClient,
            defaultHeaders: customHeaders
        )
        
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let responseBody = "data: [DONE]\n"
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        
        URLProtocolStub.stub(
            url: endpointURL,
            data: responseBody.data(using: .utf8)!,
            statusCode: 200
        )
        
        // When
        let stream = customClient.streamResponse(messages: testMessages)
        for try await _ in stream {
            // Consume stream
        }
        
        // Then
        let capturedRequests = URLProtocolStub.capturedRequests()
        let request = try XCTUnwrap(capturedRequests.first)
        
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer token123")
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-Custom"), "value")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "text/event-stream")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
    }
    
    func testCustomPath() async throws {
        // Given
        let customClient = ProxyLLMClient(
            baseURL: baseURL,
            httpClient: httpClient,
            path: "/custom/stream"
        )
        
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let responseBody = "data: [DONE]\n"
        let endpointURL = URL(string: baseURL.absoluteString + "/custom/stream")!
        
        URLProtocolStub.stub(
            url: endpointURL,
            data: responseBody.data(using: .utf8)!,
            statusCode: 200
        )
        
        // When
        let stream = customClient.streamResponse(messages: testMessages)
        for try await _ in stream {
            // Consume stream
        }
        
        // Then
        let capturedRequests = URLProtocolStub.capturedRequests()
        let request = try XCTUnwrap(capturedRequests.first)
        XCTAssertEqual(request.url, endpointURL)
    }
    
    func testInvalidResponseEncoding() async throws {
        // Given
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        
        // Stub with invalid UTF-8 data
        let invalidData = Data([0xFF, 0xFE, 0xFD])
        URLProtocolStub.stub(
            url: endpointURL,
            data: invalidData,
            statusCode: 200
        )
        
        // When & Then
        let stream = client.streamResponse(messages: testMessages)
        
        do {
            for try await _ in stream {
                XCTFail("Expected error, but received chunk")
            }
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            switch error {
            case .decoding:
                // AppError.decoding is a simple case without associated values
                break
            default:
                XCTFail("Expected decoding error, got: \(error)")
            }
        }
    }
    
    func testEmptyResponse() async throws {
        // Given
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        
        URLProtocolStub.stub(
            url: endpointURL,
            data: Data(),
            statusCode: 200
        )
        
        // When
        let stream = client.streamResponse(messages: testMessages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks, [])
    }
    
    func testMalformedSSEData() async throws {
        // Given
        let testMessages = [LLMMessage(role: "user", content: "Hello")]
        let endpointURL = URL(string: baseURL.absoluteString + "/v1/chat/stream")!
        
        let responseBody = """
        not-data: This should be ignored
        data: Valid chunk
        invalid-line
        data: Another chunk
        data: [DONE]
        """
        
        URLProtocolStub.stub(
            url: endpointURL,
            data: responseBody.data(using: .utf8)!,
            statusCode: 200
        )
        
        // When
        let stream = client.streamResponse(messages: testMessages)
        var chunks: [String] = []
        
        for try await chunk in stream {
            chunks.append(chunk)
        }
        
        // Then
        XCTAssertEqual(chunks, ["Valid chunk", "Another chunk"])
    }
}

// MARK: - Test Helpers

/// Request model for testing
private struct ChatStreamRequest: Codable {
    let model: String
    let messages: [ChatMessage]
    let temperature: Double
}

/// Message model for testing
private struct ChatMessage: Codable {
    let role: String
    let content: String
}
