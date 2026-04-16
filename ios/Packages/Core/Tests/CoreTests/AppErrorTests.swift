import XCTest
@testable import Core

final class AppErrorTests: XCTestCase {
    
    // MARK: - Equality Tests
    
    func testEquality_SimpleCase() {
        let error1 = AppError.decoding
        let error2 = AppError.decoding
        
        XCTAssertEqual(error1, error2)
    }
    
    func testEquality_NetworkErrors() {
        let error1 = AppError.network(code: 404, message: "Not found")
        let error2 = AppError.network(code: 404, message: "Not found")
        let error3 = AppError.network(code: 500, message: "Server error")
        
        XCTAssertEqual(error1, error2)
        XCTAssertNotEqual(error1, error3)
    }
    
    func testEquality_RateLimited() {
        let error1 = AppError.rateLimited(retryAfter: 30.0)
        let error2 = AppError.rateLimited(retryAfter: 30.0)
        let error3 = AppError.rateLimited(retryAfter: nil)
        
        XCTAssertEqual(error1, error2)
        XCTAssertNotEqual(error1, error3)
    }
    
    func testEquality_DifferentTypes() {
        let error1 = AppError.decoding
        let error2 = AppError.unauthorized
        
        XCTAssertNotEqual(error1, error2)
    }
    
    // MARK: - HTTP Response Mapping Tests
    
    func testFromURLResponse_401_ReturnsUnauthorized() {
        let response = HTTPURLResponse(
            url: URL(string: "https://example.com")!,
            statusCode: 401,
            httpVersion: nil,
            headerFields: nil
        )
        
        let error = AppError.fromURLResponse(response, data: nil)
        
        XCTAssertEqual(error, .unauthorized)
    }
    
    func testFromURLResponse_429_WithRetryAfter() {
        let response = HTTPURLResponse(
            url: URL(string: "https://example.com")!,
            statusCode: 429,
            httpVersion: nil,
            headerFields: ["Retry-After": "60"]
        )
        
        let error = AppError.fromURLResponse(response, data: nil)
        
        XCTAssertEqual(error, .rateLimited(retryAfter: 60.0))
    }
    
    func testFromURLResponse_429_WithoutRetryAfter() {
        let response = HTTPURLResponse(
            url: URL(string: "https://example.com")!,
            statusCode: 429,
            httpVersion: nil,
            headerFields: nil
        )
        
        let error = AppError.fromURLResponse(response, data: nil)
        
        XCTAssertEqual(error, .rateLimited(retryAfter: nil))
    }
    
    func testFromURLResponse_404_WithErrorMessage() {
        let response = HTTPURLResponse(
            url: URL(string: "https://example.com")!,
            statusCode: 404,
            httpVersion: nil,
            headerFields: nil
        )
        
        let errorData = """
        {"error": "Resource not found"}
        """.data(using: .utf8)
        
        let error = AppError.fromURLResponse(response, data: errorData)
        
        XCTAssertEqual(error, .network(code: 404, message: "Resource not found"))
    }
    
    func testFromURLResponse_NoResponse() {
        let error = AppError.fromURLResponse(nil, data: nil)
        
        XCTAssertEqual(error, .network(code: 0, message: "No response received"))
    }
    
    // MARK: - NSURLError Mapping Tests
    
    func testNSURLErrorMapping_Cancelled() {
        let urlError = NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled, userInfo: nil)
        let appError = AppError.from(urlError)
        
        XCTAssertEqual(appError, .cancelled)
    }
    
    func testNSURLErrorMapping_Other() {
        let urlError = NSError(
            domain: NSURLErrorDomain,
            code: NSURLErrorTimedOut,
            userInfo: [NSLocalizedDescriptionKey: "Request timed out"]
        )
        let appError = AppError.from(urlError)
        
        XCTAssertEqual(appError, .network(code: NSURLErrorTimedOut, message: "Timed out"))
    }
    
    // MARK: - User Message Tests
    
    func testUserMessage_Network_ServerError() {
        let error = AppError.network(code: 500, message: "Internal server error")
        
        XCTAssertEqual(error.userMessage, "Server is temporarily unavailable. Please try again.")
    }
    
    func testUserMessage_Network_ClientError() {
        let error = AppError.network(code: 400, message: "Bad request")
        
        XCTAssertEqual(error.userMessage, "Request failed. Please check your input and try again.")
    }
    
    func testUserMessage_Unauthorized() {
        let error = AppError.unauthorized
        
        XCTAssertEqual(error.userMessage, "Please sign in to continue.")
    }
    
    func testUserMessage_RateLimited() {
        let error = AppError.rateLimited(retryAfter: nil)
        
        XCTAssertEqual(error.userMessage, "Too many requests. Please wait a moment and try again.")
    }
    
    // MARK: - Description Tests
    
    func testDescription_Network() {
        let error = AppError.network(code: 404, message: "Not found")
        
        XCTAssertEqual(error.description, "Network error (404): Not found")
    }
    
    func testDescription_RateLimited_WithRetryAfter() {
        let error = AppError.rateLimited(retryAfter: 30.0)
        
        XCTAssertEqual(error.description, "Rate limited. Try again in 30 seconds")
    }
    
    func testDescription_Unknown() {
        let underlyingError = NSError(domain: "TestDomain", code: 123, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        let error = AppError.unknown(underlying: underlyingError)
        
        XCTAssertEqual(error.description, "Unexpected error: Test error")
    }
    
    // MARK: - Static from(_:) Tests
    
    func testFrom_URLErrorNotConnectedToInternet() {
        let urlError = URLError(.notConnectedToInternet)
        let appError = AppError.from(urlError)
        
        XCTAssertEqual(appError, .network(code: URLError.notConnectedToInternet.rawValue, message: "Offline"))
    }
    
    func testFrom_URLErrorTimedOut() {
        let urlError = URLError(.timedOut)
        let appError = AppError.from(urlError)
        
        XCTAssertEqual(appError, .network(code: URLError.timedOut.rawValue, message: "Timed out"))
    }
    
    func testFrom_URLErrorCancelled() {
        let urlError = URLError(.cancelled)
        let appError = AppError.from(urlError)
        
        XCTAssertEqual(appError, .cancelled)
    }
    
    func testFrom_AppErrorPassthrough() {
        let originalError = AppError.unauthorized
        let mappedError = AppError.from(originalError)
        
        XCTAssertEqual(mappedError, originalError)
    }
    
    func testFrom_GenericError() {
        let genericError = NSError(domain: "TestDomain", code: 456, userInfo: [NSLocalizedDescriptionKey: "Generic error"])
        let appError = AppError.from(genericError)
        
        // NSError is mapped to .network by AppError.from()
        XCTAssertEqual(appError, .network(code: 456, message: "Generic error"))
    }
    
    // MARK: - LocalizedError Tests
    
    func testLocalizedError_ErrorDescription() {
        let error = AppError.unauthorized
        
        XCTAssertEqual(error.errorDescription, error.userMessage)
        XCTAssertEqual(error.errorDescription, "Please sign in to continue.")
    }
    
    // MARK: - Enhanced Message Extraction Tests
    
    func testFromURLResponse_MessageKey() {
        let response = HTTPURLResponse(
            url: URL(string: "https://example.com")!,
            statusCode: 400,
            httpVersion: nil,
            headerFields: nil
        )
        
        let errorData = """
        {"message": "Invalid request format"}
        """.data(using: .utf8)
        
        let error = AppError.fromURLResponse(response, data: errorData)
        
        XCTAssertEqual(error, .network(code: 400, message: "Invalid request format"))
    }
    
    func testFromURLResponse_DetailKey() {
        let response = HTTPURLResponse(
            url: URL(string: "https://example.com")!,
            statusCode: 422,
            httpVersion: nil,
            headerFields: nil
        )
        
        let errorData = """
        {"detail": "Validation failed"}
        """.data(using: .utf8)
        
        let error = AppError.fromURLResponse(response, data: errorData)
        
        XCTAssertEqual(error, .network(code: 422, message: "Validation failed"))
    }
    
    // MARK: - HTTP-Date Retry-After Tests
    
    func testFromURLResponse_RetryAfterHTTPDate() {
        // Create a date 30 seconds in the future
        let futureDate = Date().addingTimeInterval(30)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(abbreviation: "GMT")
        let httpDateString = dateFormatter.string(from: futureDate)
        
        let response = HTTPURLResponse(
            url: URL(string: "https://example.com")!,
            statusCode: 429,
            httpVersion: nil,
            headerFields: ["Retry-After": httpDateString]
        )
        
        let error = AppError.fromURLResponse(response, data: nil)
        
        if case .rateLimited(let retryAfter) = error {
            XCTAssertNotNil(retryAfter)
            // Should be approximately 30 seconds (allow some tolerance for test execution time)
            XCTAssertGreaterThan(retryAfter!, 25)
            XCTAssertLessThan(retryAfter!, 35)
        } else {
            XCTFail("Expected rateLimited error with retryAfter")
        }
    }
    
    // MARK: - Enhanced Equatable Tests for .unknown
    
    func testEquality_Unknown_NSErrorDomainAndCode() {
        let error1 = NSError(domain: "TestDomain", code: 123, userInfo: [NSLocalizedDescriptionKey: "Error 1"])
        let error2 = NSError(domain: "TestDomain", code: 123, userInfo: [NSLocalizedDescriptionKey: "Error 2"])
        let error3 = NSError(domain: "TestDomain", code: 456, userInfo: [NSLocalizedDescriptionKey: "Error 3"])
        let error4 = NSError(domain: "OtherDomain", code: 123, userInfo: [NSLocalizedDescriptionKey: "Error 4"])
        
        let appError1 = AppError.unknown(underlying: error1)
        let appError2 = AppError.unknown(underlying: error2)
        let appError3 = AppError.unknown(underlying: error3)
        let appError4 = AppError.unknown(underlying: error4)
        
        // Same domain and code should be equal even with different descriptions
        XCTAssertEqual(appError1, appError2)
        
        // Different codes should not be equal
        XCTAssertNotEqual(appError1, appError3)
        
        // Different domains should not be equal
        XCTAssertNotEqual(appError1, appError4)
    }
    
    // MARK: - User Message Enhancement Tests
    
    func testUserMessage_OfflineDetection() {
        let error1 = AppError.network(code: -1009, message: "The Internet connection appears to be offline")
        let error2 = AppError.network(code: -1009, message: "not connected to internet")
        
        XCTAssertEqual(error1.userMessage, "You're offline. Please check your internet connection.")
        XCTAssertEqual(error2.userMessage, "You're offline. Please check your internet connection.")
    }
    
    func testUserMessage_TimeoutDetection() {
        let error1 = AppError.network(code: -1001, message: "The request timed out")
        let error2 = AppError.network(code: -1001, message: "Request timeout occurred")
        
        XCTAssertEqual(error1.userMessage, "Request timed out. Please try again.")
        XCTAssertEqual(error2.userMessage, "Request timed out. Please try again.")
    }
}
