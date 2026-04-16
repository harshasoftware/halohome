import Foundation
import CartoStorage
import Core

/// Generic infinite scroll paginator with cursor-based pagination
@MainActor
public final class InfinitePaginator: Sendable {
    
    /// Pagination state
    public enum State: Sendable, Equatable {
        case idle
        case loadingMore
        case endReached
        case error(retryable: Bool, message: String)
    }
    
    // Configuration
    public let pageSize: Int
    public let prefetchThreshold: Int
    
    // Current state
    public private(set) var state: State = .idle
    private var lastCursor: MessageCursor?
    private var isLoading = false
    
    public init(pageSize: Int = 50, prefetchThreshold: Int = 5) {
        self.pageSize = pageSize
        self.prefetchThreshold = prefetchThreshold
    }
    
    /// Reset paginator to initial state
    public func reset() {
        state = .idle
        lastCursor = nil
        isLoading = false
    }
    
    /// Check if should load more based on visible index
    public func shouldLoadMore(visibleIndex: Int, totalCount: Int) -> Bool {
        guard !isLoading else { return false }
        guard case .idle = state else { return false }
        
        // Load when approaching the end (within prefetch threshold)
        let distanceFromEnd = totalCount - visibleIndex
        return distanceFromEnd <= prefetchThreshold
    }
    
    /// Load next page
    public func loadNext(
        using loader: (MessageCursor?) async throws -> (items: [MessageDTO], next: MessageCursor?)
    ) async -> Result<[ChatMessage], AppError> {
        guard !isLoading else {
            return .failure(.validation(message: "Already loading"))
        }
        
        isLoading = true
        state = .loadingMore
        
        do {
            let result = try await loader(lastCursor)
            
            isLoading = false
            
            if result.items.isEmpty || result.next == nil {
                state = .endReached
            } else {
                state = .idle
                lastCursor = result.next
            }
            
            let messages = result.items.map(ChatMappers.toChatMessage)
            return .success(messages)
            
        } catch is CancellationError {
            isLoading = false
            state = .idle
            return .failure(.cancelled)
        } catch {
            isLoading = false
            let appError = AppError.from(error)
            
            // Determine if retryable
            let retryable = isRetryable(appError)
            state = .error(retryable: retryable, message: appError.userMessage)
            
            return .failure(appError)
        }
    }
    
    private func isRetryable(_ error: AppError) -> Bool {
        switch error {
        case .network, .rateLimited, .server:
            return true
        default:
            return false
        }
    }
}


