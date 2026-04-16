import Foundation

/// URLProtocol stub for testing network requests
final class URLProtocolStub: URLProtocol {
    
    static let stubsLock = NSLock()
    nonisolated(unsafe) static var stubs: [String: (data: Data?, response: HTTPURLResponse?, error: Error?)] = [:]
    
    override class func canInit(with request: URLRequest) -> Bool {
        true
    }
    
    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }
    
    override func startLoading() {
        guard let url = request.url else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }
        
        let stub = Self.stubsLock.withLock {
            Self.stubs[url.absoluteString]
        }
        
        guard let stub = stub else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }
        
        if let response = stub.response {
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        }
        
        if let data = stub.data {
            client?.urlProtocol(self, didLoad: data)
        }
        
        if let error = stub.error {
            client?.urlProtocol(self, didFailWithError: error)
        } else {
            client?.urlProtocolDidFinishLoading(self)
        }
    }
    
    override func stopLoading() {
        // No-op
    }
    
    static func reset() {
        stubsLock.withLock {
            stubs.removeAll()
        }
    }
}
