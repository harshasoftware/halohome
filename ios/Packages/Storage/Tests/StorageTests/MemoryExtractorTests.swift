import XCTest
@testable import CartoStorage

final class MemoryExtractorTests: XCTestCase {
    var extractor: KeywordMemoryExtractor!
    
    override func setUp() {
        super.setUp()
        extractor = KeywordMemoryExtractor()
    }
    
    override func tearDown() {
        extractor = nil
        super.tearDown()
    }
    
    // MARK: - Personal Information Tests
    
    func testExtract_personalInfo_iAm() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I am a software engineer", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("software engineer") ?? false)
        XCTAssertEqual(memories.first?.importance, 8)
        XCTAssertTrue(memories.first?.keywords.contains("software") ?? false)
    }
    
    func testExtract_personalInfo_myNameIs() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "My name is John Smith", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("john smith") ?? false)
        XCTAssertEqual(memories.first?.importance, 8)
    }
    
    func testExtract_personalInfo_iLiveIn() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I live in San Francisco", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("san francisco") ?? false)
    }
    
    // MARK: - Preference Tests
    
    func testExtract_preference_iLike() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I like dark mode interfaces", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("dark mode") ?? false)
        XCTAssertEqual(memories.first?.importance, 7)
    }
    
    func testExtract_preference_iPrefer() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I prefer coffee over tea", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("coffee") ?? false)
    }
    
    func testExtract_preference_iHate() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I hate spicy food", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("spicy food") ?? false)
    }
    
    // MARK: - Explicit Memory Tests
    
    func testExtract_explicitMemory_rememberThat() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "Remember that I'm allergic to peanuts", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("allergic to peanuts") ?? false)
        XCTAssertEqual(memories.first?.importance, 9) // Explicit requests are highest importance
    }
    
    func testExtract_explicitMemory_dontForget() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "Don't forget I have a meeting at 3pm", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertEqual(memories.first?.importance, 9)
    }
    
    // MARK: - Correction Tests
    
    func testExtract_correction_actually() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "Actually, I prefer Python over JavaScript", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("python") ?? false)
        XCTAssertEqual(memories.first?.importance, 8)
    }
    
    func testExtract_correction_iMeant() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I meant to say I work remotely", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("remotely") ?? false)
    }
    
    // MARK: - Multiple Patterns Tests
    
    func testExtract_multiplePatterns_inOneMessage() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I am a developer and I like Swift programming", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 2)
    }
    
    func testExtract_multipleMessages() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "My name is Alice", createdAt: Date()),
            ChatMessageForExtraction(role: "user", text: "I like hiking", createdAt: Date()),
            ChatMessageForExtraction(role: "user", text: "Remember that I'm vegetarian", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 3)
    }
    
    // MARK: - Edge Cases
    
    func testExtract_ignoresAssistantMessages() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "assistant", text: "I am an AI assistant", createdAt: Date()),
            ChatMessageForExtraction(role: "user", text: "I am a user", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
        XCTAssertTrue(memories.first?.content.lowercased().contains("user") ?? false)
    }
    
    func testExtract_noPatterns_returnsEmpty() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "What's the weather today?", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertTrue(memories.isEmpty)
    }
    
    func testExtract_deduplicatesSimilarMemories() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I like coffee", createdAt: Date()),
            ChatMessageForExtraction(role: "user", text: "I like coffee", createdAt: Date()) // Duplicate
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        XCTAssertEqual(memories.count, 1)
    }
    
    func testExtract_limitsToRecentMessages() async {
        // Given: More than 10 messages
        var messages: [ChatMessageForExtraction] = []
        for i in 1...15 {
            messages.append(ChatMessageForExtraction(role: "user", text: "I like item \(i)", createdAt: Date()))
        }
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then: Should only process first 10
        XCTAssertLessThanOrEqual(memories.count, 10)
    }
    
    // MARK: - Keyword Extraction Tests
    
    func testExtract_extractsRelevantKeywords() async {
        // Given
        let messages = [
            ChatMessageForExtraction(role: "user", text: "I am a software engineer specializing in iOS development", createdAt: Date())
        ]
        
        // When
        let memories = await extractor.extractMemories(from: messages)
        
        // Then
        let keywords = memories.first?.keywords ?? []
        XCTAssertTrue(keywords.contains("software"))
        XCTAssertTrue(keywords.contains("engineer"))
        XCTAssertTrue(keywords.contains("ios"))
        XCTAssertTrue(keywords.contains("development"))
        // Stopwords should be filtered out
        XCTAssertFalse(keywords.contains("a"))
        XCTAssertFalse(keywords.contains("in"))
    }
}

