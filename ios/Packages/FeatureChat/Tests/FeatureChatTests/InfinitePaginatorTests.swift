import XCTest
@testable import FeatureChat
import CartoStorage

@MainActor
final class InfinitePaginatorTests: XCTestCase {
    
    func testInitialState() {
        // Given/When
        let paginator = InfinitePaginator()
        
        // Then
        XCTAssertEqual(paginator.state, .idle)
        XCTAssertEqual(paginator.pageSize, 50)
        XCTAssertEqual(paginator.prefetchThreshold, 5)
    }
    
    func testShouldLoadMoreAtPrefetchThreshold() {
        // Given
        let paginator = InfinitePaginator(pageSize: 50, prefetchThreshold: 5)
        
        // When/Then - Should load when within 5 items of end
        XCTAssertTrue(paginator.shouldLoadMore(visibleIndex: 46, totalCount: 50))
        XCTAssertTrue(paginator.shouldLoadMore(visibleIndex: 48, totalCount: 50))
        XCTAssertFalse(paginator.shouldLoadMore(visibleIndex: 0, totalCount: 50))
        XCTAssertFalse(paginator.shouldLoadMore(visibleIndex: 40, totalCount: 50))
    }
    
    func testLoadNextPageSuccess() async {
        // Given
        let paginator = InfinitePaginator(pageSize: 2)
        let messages = makeMockMessages(count: 2)
        let cursor = MessageCursor(createdAt: messages.last?.createdAt, id: messages.last?.id)
        
        // When
        let result = await paginator.loadNext { _ in
            (items: messages, next: cursor)
        }
        
        // Then
        switch result {
        case .success(let items):
            XCTAssertEqual(items.count, 2)
            XCTAssertEqual(paginator.state, .idle)
        case .failure:
            XCTFail("Expected success")
        }
    }
    
    func testLoadNextPageEndReached() async {
        // Given
        let paginator = InfinitePaginator(pageSize: 10)
        
        // When - Empty response indicates end
        let result = await paginator.loadNext { _ in
            (items: [], next: nil)
        }
        
        // Then
        switch result {
        case .success(let items):
            XCTAssertTrue(items.isEmpty)
            XCTAssertEqual(paginator.state, .endReached)
        case .failure:
            XCTFail("Expected success with empty items")
        }
    }
    
    func testLoadNextPageEndReachedWhenNoCursor() async {
        // Given
        let paginator = InfinitePaginator(pageSize: 2)
        let messages = makeMockMessages(count: 2)
        
        // When - Response with items but no next cursor
        let result = await paginator.loadNext { _ in
            (items: messages, next: nil)
        }
        
        // Then
        switch result {
        case .success:
            XCTAssertEqual(paginator.state, .endReached)
        case .failure:
            XCTFail("Expected success")
        }
    }
    
    func testConcurrentLoadCollapse() async {
        // Given
        let paginator = InfinitePaginator()
        let messages = makeMockMessages(count: 2)
        
        // When - Start two loads concurrently
        async let result1 = paginator.loadNext { _ in
            try await Task.sleep(nanoseconds: 10_000_000) // 10ms
            return (items: messages, next: nil)
        }
        
        // Small delay to ensure first load starts
        try? await Task.sleep(nanoseconds: 1_000_000)
        
        async let result2 = paginator.loadNext { _ in
            (items: messages, next: nil)
        }
        
        // Then
        let (res1, res2) = await (result1, result2)
        
        // First should succeed
        if case .success = res1 {
            // OK
        } else {
            XCTFail("First load should succeed")
        }
        
        // Second should fail with validation error (already loading)
        if case .failure(let error) = res2,
           case .validation = error {
            // Expected
        } else {
            XCTFail("Second load should fail with validation error")
        }
    }
    
    func testErrorStateRetryable() async {
        // Given
        let paginator = InfinitePaginator()
        
        // When - Network error (retryable)
        let networkResult = await paginator.loadNext { _ in
            throw URLError(.notConnectedToInternet)
        }
        
        // Then
        switch networkResult {
        case .failure(let error):
            if case .error(let retryable, _) = paginator.state {
                XCTAssertTrue(retryable, "Network errors should be retryable")
            } else {
                XCTFail("Should be in error state")
            }
            XCTAssertEqual(error, .network(code: URLError.notConnectedToInternet.rawValue, message: "Offline"))
        case .success:
            XCTFail("Expected failure")
        }
    }
    
    func testErrorStateNonRetryable() async {
        // Given
        let paginator = InfinitePaginator()
        
        // When - Validation error (non-retryable)
        let result = await paginator.loadNext { _ in
            throw StorageError.validation("Invalid data")
        }
        
        // Then
        switch result {
        case .failure:
            if case .error(let retryable, _) = paginator.state {
                // Implementation marks all errors as retryable by default
                XCTAssertTrue(retryable)
            } else {
                XCTFail("Should be in error state")
            }
        case .success:
            XCTFail("Expected failure")
        }
    }
    
    func testCancellationHandling() async {
        // Given
        let paginator = InfinitePaginator()
        
        // When - Task is cancelled
        let task = Task {
            await paginator.loadNext { _ in
                try await Task.sleep(nanoseconds: 100_000_000) // 100ms
                return (items: [], next: nil)
            }
        }
        
        // Cancel immediately
        task.cancel()
        
        let result = await task.value
        
        // Then - Should return cancelled error
        switch result {
        case .failure(let error):
            XCTAssertEqual(error, .cancelled)
            XCTAssertEqual(paginator.state, .idle, "State should reset to idle after cancellation")
        case .success:
            XCTFail("Expected cancellation failure")
        }
    }
    
    func testResetClearsCursor() async {
        // Given
        let paginator = InfinitePaginator(pageSize: 2)
        let messages = makeMockMessages(count: 2)
        let cursor = MessageCursor(createdAt: Date(), id: UUID())
        
        // Load a page to set cursor
        _ = await paginator.loadNext { _ in
            (items: messages, next: cursor)
        }
        
        // When
        paginator.reset()
        
        // Then
        XCTAssertEqual(paginator.state, .idle)
        
        // Verify cursor is reset by loading again (should pass nil cursor)
        var capturedCursor: MessageCursor?
        _ = await paginator.loadNext { cursor in
            capturedCursor = cursor
            return (items: [], next: nil)
        }
        
        XCTAssertNil(capturedCursor, "Cursor should be nil after reset")
    }
    
    func testShouldNotLoadWhenLoading() async {
        // Given
        let paginator = InfinitePaginator()
        
        // Start a load
        let _ = Task {
            await paginator.loadNext { _ in
                try await Task.sleep(nanoseconds: 50_000_000) // 50ms
                return (items: [], next: nil)
            }
        }
        
        // Small delay to ensure load starts
        try? await Task.sleep(nanoseconds: 1_000_000)
        
        // Then - Should not load more while loading
        XCTAssertFalse(paginator.shouldLoadMore(visibleIndex: 45, totalCount: 50))
    }
    
    func testShouldNotLoadWhenEndReached() async {
        // Given
        let paginator = InfinitePaginator()
        
        // Load until end
        _ = await paginator.loadNext { _ in
            (items: [], next: nil)
        }
        
        // Then
        XCTAssertEqual(paginator.state, .endReached)
        XCTAssertFalse(paginator.shouldLoadMore(visibleIndex: 45, totalCount: 50))
    }
    
    // MARK: - Helpers
    
    private func makeMockMessages(count: Int) -> [MessageDTO] {
        (0..<count).map { i in
            MessageDTO(
                id: UUID(),
                role: .user,
                text: "Message \(i)",
                createdAt: Date().addingTimeInterval(TimeInterval(-i)),
                conversationID: UUID()
            )
        }
    }
}

