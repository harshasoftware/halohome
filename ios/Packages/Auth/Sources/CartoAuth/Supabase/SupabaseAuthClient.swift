import Foundation
import Networking

/// URLSession-based HTTP client for Supabase
@available(iOS 17.0, *)
public struct SupabaseHTTPClient: HTTPClient {
    private let baseURL: URL
    private let session: URLSession
    
    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }
    
    public func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        // Build URL
        guard var urlComponents = URLComponents(url: baseURL, resolvingAgainstBaseURL: true) else {
            throw URLError(.badURL)
        }
        urlComponents.path = request.path
        
        // Add query parameters
        if !request.query.isEmpty {
            urlComponents.queryItems = request.query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        
        guard let url = urlComponents.url else {
            throw URLError(.badURL)
        }
        
        // Create URLRequest
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.httpBody = request.body
        
        // Set headers
        request.headers.forEach { key, value in
            urlRequest.setValue(value, forHTTPHeaderField: key)
        }
        
        // Perform request
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        // Convert headers to dictionary
        var headers: [String: String] = [:]
        httpResponse.allHeaderFields.forEach { key, value in
            if let key = key as? String, let value = value as? String {
                headers[key.lowercased()] = value
            }
        }
        
        return HTTPResponse(
            statusCode: httpResponse.statusCode,
            headers: headers,
            data: data
        )
    }
}
