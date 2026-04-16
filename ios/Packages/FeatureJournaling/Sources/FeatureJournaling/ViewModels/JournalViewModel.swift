import Foundation
import Core

/// ViewModel for the journal feature
@MainActor
@Observable
public final class JournalViewModel {

    // MARK: - State

    /// All journal entries for the current user
    public private(set) var entries: [JournalEntry] = []

    /// Whether entries are currently loading
    public var isLoading = false

    /// Error message to display
    public var errorMessage: String?

    /// Currently selected entry for editing
    public var selectedEntry: JournalEntry?

    /// Whether the create/edit sheet is presented
    public var isShowingEntryEditor = false

    /// Draft entry being created or edited
    public var draftText: String = ""
    public var draftMood: Int? = nil
    public var draftIsPublic: Bool = false
    public var draftConsentForAITraining: Bool = false

    /// Detected influences for the current location
    public private(set) var detectedInfluences: [PlanetaryInfluence] = []
    public var isDetectingInfluences = false

    // MARK: - Dependencies

    private let repository: JournalRepositoryProtocol
    private let zoneDetection: ZoneDetectionProtocol

    // MARK: - Init

    public init(
        repository: JournalRepositoryProtocol,
        zoneDetection: ZoneDetectionProtocol
    ) {
        self.repository = repository
        self.zoneDetection = zoneDetection
    }

    // MARK: - Load

    public func loadEntries() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            entries = try await repository.loadEntries()
                .sorted { $0.createdAt > $1.createdAt }
        } catch {
            AppLogger.error("Failed to load journal entries: \(error)", category: AppLogger.storage)
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Create

    /// Start creating a new entry with pre-filled location data
    public func startNewEntry(
        latitude: Double,
        longitude: Double,
        placeName: String,
        daysStayed: Int = 0,
        stayStartDate: Date? = nil
    ) {
        selectedEntry = nil
        draftText = ""
        draftMood = nil
        draftIsPublic = false
        draftConsentForAITraining = false
        isShowingEntryEditor = true

        // Detect influences for this location
        Task {
            await detectInfluences(latitude: latitude, longitude: longitude)
        }
    }

    /// Save the current draft as a new entry or update the existing one
    public func saveDraft(
        userId: String,
        latitude: Double,
        longitude: Double,
        placeName: String,
        daysStayed: Int = 0,
        stayStartDate: Date? = nil
    ) async {
        errorMessage = nil

        do {
            if var existing = selectedEntry {
                // Update existing entry
                existing.userText = draftText
                existing.mood = draftMood
                existing.isPublic = draftIsPublic
                existing.consentForAITraining = draftConsentForAITraining
                existing.updatedAt = Date()

                let updated = try await repository.updateEntry(existing)

                if let index = entries.firstIndex(where: { $0.id == updated.id }) {
                    entries[index] = updated
                }
                AppLogger.info("Journal entry updated: \(updated.id)", category: AppLogger.storage)
            } else {
                // Create new entry
                let entry = JournalEntry(
                    userId: userId,
                    latitude: latitude,
                    longitude: longitude,
                    placeName: placeName,
                    daysStayed: daysStayed,
                    stayStartDate: stayStartDate,
                    planetaryInfluences: detectedInfluences,
                    userText: draftText,
                    mood: draftMood,
                    isPublic: draftIsPublic,
                    consentForAITraining: draftConsentForAITraining
                )

                let created = try await repository.createEntry(entry)
                entries.insert(created, at: 0)
                AppLogger.info("Journal entry created: \(created.id)", category: AppLogger.storage)
            }

            isShowingEntryEditor = false
        } catch {
            AppLogger.error("Failed to save journal entry: \(error)", category: AppLogger.storage)
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Edit

    /// Begin editing an existing entry
    public func editEntry(_ entry: JournalEntry) {
        selectedEntry = entry
        draftText = entry.userText
        draftMood = entry.mood
        draftIsPublic = entry.isPublic
        draftConsentForAITraining = entry.consentForAITraining
        detectedInfluences = entry.planetaryInfluences
        isShowingEntryEditor = true
    }

    // MARK: - Delete

    public func deleteEntry(_ entry: JournalEntry) async {
        errorMessage = nil

        do {
            try await repository.deleteEntry(id: entry.id)
            entries.removeAll { $0.id == entry.id }
            AppLogger.info("Journal entry deleted: \(entry.id)", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to delete journal entry: \(error)", category: AppLogger.storage)
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Zone Detection

    public func detectInfluences(latitude: Double, longitude: Double) async {
        isDetectingInfluences = true
        defer { isDetectingInfluences = false }

        do {
            detectedInfluences = try await zoneDetection.detectInfluences(
                latitude: latitude,
                longitude: longitude
            )
        } catch {
            AppLogger.error("Failed to detect influences: \(error)", category: AppLogger.storage)
            detectedInfluences = []
        }
    }
}
