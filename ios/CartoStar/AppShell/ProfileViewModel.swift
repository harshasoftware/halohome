import Foundation
import SwiftUI
import PhotosUI
import CartoAuth
import Payments
import CartoStorage
import Core
import FeatureBirthData

/// Profile screen view model
/// Manages user profile data, subscription status, and account actions
@MainActor
@Observable
public final class ProfileViewModel {
    
    // MARK: - State
    
    var user: AuthUser?
    var subscriptionStatus: SubscriptionInfo?
    var isLoading = false
    var isLoadingPhoto = false
    var isRestoringPurchases = false
    var errorMessage: String?
    var successMessage: String?
    var showSignOutConfirmation = false
    var showDeleteAccountConfirmation = false
    var showEditProfile = false
    var editingName: String = ""
    var selectedPhoto: PhotosPickerItem?
    var profileImageData: Data?
    
    // MARK: - Subscription Info
    
    public struct SubscriptionInfo {
        let isActive: Bool
        let planName: String?
        let expiryDate: Date?
        let willRenew: Bool
        
        public init(isActive: Bool, planName: String? = nil, expiryDate: Date? = nil, willRenew: Bool = false) {
            self.isActive = isActive
            self.planName = planName
            self.expiryDate = expiryDate
            self.willRenew = willRenew
        }
    }
    
    // MARK: - Dependencies

    private let authClient: AuthClient
    private let paymentsClient: PaymentsClient
    private let photoStorageClient: ProfilePhotoStorageClient?
    private let store = ProtectedFileStore()
    
    // MARK: - Initialization
    
    public init(
        authClient: AuthClient,
        paymentsClient: PaymentsClient,
        photoStorageClient: ProfilePhotoStorageClient? = nil
    ) {
        self.authClient = authClient
        self.paymentsClient = paymentsClient
        self.photoStorageClient = photoStorageClient
    }
    
    // MARK: - Computed Properties
    
    /// Check if there are unsaved changes
    var hasChanges: Bool {
        guard let user = user else { return false }
        
        let nameChanged = editingName != user.name
        let photoChanged = profileImageData != nil
        
        return nameChanged || photoChanged
    }
    
    /// Check if profile can be saved
    var canSave: Bool {
        let nameValid = !editingName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return nameValid && hasChanges
    }
    
    // MARK: - Public Methods
    
    /// Load profile data
    public func loadProfile() async {
        isLoading = true
        errorMessage = nil
        
        defer { isLoading = false }
        
        // Load user info from auth client
        let loadedUser = await authClient.currentUser()
        
        // Check for persisted profile updates
        if let loadedUser = loadedUser {
            migrateProfileFromUserDefaults(userId: loadedUser.id)
            let savedName = store.load(String.self, key: "profileName_\(loadedUser.id)")

            // Try to load photo from backend first, fallback to local protected store
            if let photoStorageClient = photoStorageClient {
                do {
                    if let photoData = try await photoStorageClient.download(userId: loadedUser.id) {
                        profileImageData = photoData
                        AppLogger.info("Profile photo loaded from storage", category: AppLogger.ui)
                    }
                } catch {
                    AppLogger.debug("No profile photo in storage, checking local store", category: AppLogger.ui)
                    let savedPhotoData = store.load(Data.self, key: "profilePhoto_\(loadedUser.id)")
                    profileImageData = savedPhotoData
                }
            } else {
                let savedPhotoData = store.load(Data.self, key: "profilePhoto_\(loadedUser.id)")
                profileImageData = savedPhotoData
            }
            
            // Apply persisted name if any
            if savedName != nil || profileImageData != nil {
                user = AuthUser(
                    id: loadedUser.id,
                    email: loadedUser.email,
                    name: savedName ?? loadedUser.name,
                    avatarURL: loadedUser.avatarURL
                )
            } else {
                user = loadedUser
            }
        } else {
            user = loadedUser
        }
        
        // Load subscription status
        await loadSubscriptionStatus()
        
        AppLogger.debug("Profile loaded for user: \(self.user?.id ?? "nil")", category: AppLogger.ui)
    }
    
    /// Load subscription status from payments client
    private func loadSubscriptionStatus() async {
        let state = await paymentsClient.currentState()
        
        if state.isSubscribed {
            // Check if will renew based on expiry date (simplified logic)
            let willRenew = state.expirationDate.map { $0 > Date().addingTimeInterval(24 * 60 * 60) } ?? true
            
            subscriptionStatus = SubscriptionInfo(
                isActive: true,
                planName: "Pro",
                expiryDate: state.expirationDate,
                willRenew: willRenew
            )
        } else {
            subscriptionStatus = SubscriptionInfo(
                isActive: false,
                planName: "Free",
                expiryDate: nil,
                willRenew: false
            )
        }
    }
    
    // MARK: - Actions
    
    /// Sign out the current user
    public func signOut() async {
        do {
            try await authClient.signOut()
            AppLogger.info("User signed out successfully", category: AppLogger.ui)
        } catch {
            errorMessage = "Failed to sign out. Please try again."
            AppLogger.error("Sign out failed: \(error)", category: AppLogger.ui)
        }
    }
    
    /// Delete account permanently
    /// Flow: cancel subscription → clear local data → delete server user → sign out
    public func deleteAccount() async {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        guard let currentUser = user else {
            errorMessage = "No user found"
            return
        }

        AppLogger.info("Starting account deletion for user: \(currentUser.id)", category: AppLogger.ui)

        // 1. Cancel active subscription (best-effort)
        if subscriptionStatus?.isActive == true {
            do {
                try await paymentsClient.restore()
                AppLogger.info("Subscription handled before deletion", category: AppLogger.ui)
            } catch {
                AppLogger.error("Failed to handle subscription before deletion: \(error)", category: AppLogger.ui)
            }
        }

        // 2. Clear local data
        store.delete(key: "profileName_\(currentUser.id)")
        store.delete(key: "profilePhoto_\(currentUser.id)")
        UserDefaults.standard.removeObject(forKey: "hasBirthData")

        let birthStore = BirthDataStore.shared
        birthStore.currentBirthData = nil
        for chart in birthStore.savedCharts {
            birthStore.deleteChart(chart)
        }
        birthStore.clearRecentLocations()

        // 3. Clear profile photo from storage (best-effort)
        if let photoStorageClient = photoStorageClient {
            try? await photoStorageClient.delete(userId: currentUser.id)
        }

        // 4. Delete account on server
        do {
            try await authClient.deleteAccount()
            AppLogger.info("Account deleted successfully", category: AppLogger.ui)
        } catch {
            // Server deletion failed — still clear local state so user isn't stuck
            AppLogger.error("Server account deletion failed: \(error). Signing out locally.", category: AppLogger.ui)
            do {
                try await authClient.signOut()
            } catch {
                AppLogger.error("Sign out after failed deletion also failed: \(error)", category: AppLogger.ui)
            }
            return
        }
        // signOut + unauthenticated state emission is handled inside deleteAccount()
    }
    
    /// Restore purchases - REQUIRED by App Store Guideline 3.1.1
    /// Must be user-initiated only (not called automatically on launch)
    public func restorePurchases() async {
        isRestoringPurchases = true
        errorMessage = nil
        
        defer { isRestoringPurchases = false }
        
        do {
            // restore() returns the state directly - no race condition
            let restoredState = try await paymentsClient.restore()
            AppLogger.info("Restore successful, isSubscribed: \(restoredState.isSubscribed)", category: AppLogger.ui)
            
            if restoredState.isSubscribed {
                // Update local subscription status
                let willRenew = restoredState.expirationDate.map { $0 > Date().addingTimeInterval(24 * 60 * 60) } ?? true
                subscriptionStatus = SubscriptionInfo(
                    isActive: true,
                    planName: "Pro",
                    expiryDate: restoredState.expirationDate,
                    willRenew: willRenew
                )
                successMessage = "Purchases restored! Your subscription is now active."
            } else {
                errorMessage = "No active subscription found to restore."
            }
        } catch {
            let appError = AppError.from(error)
            errorMessage = "Restore failed: \(appError.userMessage)"
            AppLogger.error("Restore failed: \(error)", category: AppLogger.ui)
        }
    }
    
    /// Start editing profile
    public func startEditingProfile() {
        editingName = user?.name ?? ""
        selectedPhoto = nil
        // Keep existing profileImageData (already loaded in loadProfile)
        showEditProfile = true
    }
    
    /// Handle photo selection with validation and processing
    public func loadPhoto() async {
        guard let selectedPhoto = selectedPhoto else { return }
        
        isLoadingPhoto = true
        errorMessage = nil
        
        defer { isLoadingPhoto = false }
        
        do {
            // Load raw image data
            guard let rawData = try await selectedPhoto.loadTransferable(type: Data.self) else {
                errorMessage = "Failed to load selected photo"
                return
            }
            
            // Process image (validate, crop, compress)
            let processedData = ImageUtilities.processForProfile(rawData, targetSizeKB: 500)
            
            switch processedData {
            case .success(let data):
                profileImageData = data
                AppLogger.info("Profile photo processed successfully (\(data.count / 1024)KB)", category: AppLogger.ui)
                
            case .failure(let error):
                errorMessage = error.localizedDescription
                AppLogger.error("Photo processing failed: \(error)", category: AppLogger.ui)
            }
            
        } catch {
            AppLogger.error("Failed to load photo: \(error)", category: AppLogger.ui)
            errorMessage = "Failed to load photo. Please try again."
        }
    }
    
    /// Remove profile photo
    public func removePhoto() {
        profileImageData = nil
        selectedPhoto = nil
        AppLogger.info("Profile photo removed", category: AppLogger.ui)
    }
    
    /// Save profile changes
    public func saveProfile() async {
        guard !editingName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Name cannot be empty"
            return
        }
        
        isLoading = true
        errorMessage = nil
        successMessage = nil
        
        defer { isLoading = false }
        
        guard let currentUser = user else {
            errorMessage = "User not found"
            return
        }
        
        var photoURL: URL? = nil
        
        // Upload photo to backend if storage client available
        if let photoData = profileImageData, let photoStorageClient = photoStorageClient {
            do {
                photoURL = try await photoStorageClient.upload(data: photoData, userId: currentUser.id)
                AppLogger.info("Profile photo uploaded to storage", category: AppLogger.ui)

                // Clear local store since we now have it in storage
                store.delete(key: "profilePhoto_\(currentUser.id)")

            } catch {
                AppLogger.error("Photo upload failed, falling back to local storage: \(error)", category: AppLogger.ui)
                try? store.save(photoData, key: "profilePhoto_\(currentUser.id)")
            }
        } else if let photoData = profileImageData {
            // No storage client, save locally
            try? store.save(photoData, key: "profilePhoto_\(currentUser.id)")
            AppLogger.info("Profile photo saved locally", category: AppLogger.ui)
        }
        
        // TODO: Implement backend profile update
        // try await authClient.updateProfile(name: editingName, avatarURL: photoURL)
        
        // For now, persist to UserDefaults
        let updatedUser = AuthUser(
            id: currentUser.id,
            email: currentUser.email,
            name: editingName,
            avatarURL: photoURL ?? currentUser.avatarURL
        )
        
        // Persist the updated name
        try? store.save(editingName, key: "profileName_\(currentUser.id)")
        
        // Update local state
        user = updatedUser
        
        successMessage = "Profile updated successfully"
        AppLogger.info("Profile saved successfully", category: AppLogger.ui)
        
        showEditProfile = false
    }
    
    /// Cancel profile editing
    public func cancelEditing() {
        editingName = ""
        selectedPhoto = nil
        // Don't clear profileImageData - keep the saved photo
        showEditProfile = false
        errorMessage = nil
    }

    // MARK: - Migration

    private func migrateProfileFromUserDefaults(userId: String) {
        let defaults = UserDefaults.standard
        let sentinel = "com.halohome.storage.profile.\(userId).migrated"
        guard !defaults.bool(forKey: sentinel) else { return }

        // Migrate profile name
        if let name = defaults.string(forKey: "profileName_\(userId)") {
            try? store.save(name, key: "profileName_\(userId)")
            defaults.removeObject(forKey: "profileName_\(userId)")
        }

        // Migrate profile photo
        if let photoData = defaults.data(forKey: "profilePhoto_\(userId)") {
            try? store.save(photoData, key: "profilePhoto_\(userId)")
            defaults.removeObject(forKey: "profilePhoto_\(userId)")
        }

        defaults.set(true, forKey: sentinel)
    }
}
