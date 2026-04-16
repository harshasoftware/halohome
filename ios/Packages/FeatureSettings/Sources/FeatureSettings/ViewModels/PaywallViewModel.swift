import Foundation
import SwiftUI
import Core
import Payments

/// ViewModel for paywall screen
@MainActor
@Observable
public final class PaywallViewModel {
    
    // MARK: - Published State
    
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var isSubscribed: Bool = false
    public var offerings: [PaymentsOffering] = []
    public var selectedOffering: PaymentsOffering?
    
    // MARK: - Dependencies
    
    private let paymentsClient: PaymentsClient
    
    // MARK: - Private State

    /// Task for observing payments state
    private var paymentsStateTask: Task<Void, Never>?
    
    // MARK: - Initialization
    
    public init(paymentsClient: PaymentsClient) {
        self.paymentsClient = paymentsClient
    }
    
    // MARK: - Public Methods
    
    /// Load paywall data and start observing payment states
    public func appear() async {
        isLoading = true
        errorMessage = nil
        
        defer { isLoading = false }
        
        // Observe payment states
        observePaymentsState()
        
        // Get current subscription state
        let currentState = await paymentsClient.currentState()
        isSubscribed = currentState.isSubscribed
        
        // Load product offerings with pricing
        do {
            offerings = try await paymentsClient.getOfferings()
            
            // Select default offering (prefer monthly, fallback to first)
            selectedOffering = offerings.first { $0.packageType == .monthly } ?? offerings.first
            
            AppLogger.debug("Paywall loaded with \(self.offerings.count) offerings", category: AppLogger.feature)
        } catch {
            let appError = AppError.from(error)
            errorMessage = appError.userMessage
            AppLogger.error("Failed to load offerings: \(error)", category: AppLogger.feature)
        }
    }
    
    /// Purchase the selected subscription
    public func purchase() async {
        guard let offering = selectedOffering else {
            errorMessage = "Please select a subscription plan"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        defer { isLoading = false }
        
        do {
            try await paymentsClient.purchase(productID: offering.id)
            AppLogger.info("Purchase successful for \(offering.title)", category: AppLogger.feature)
            errorMessage = nil
        } catch let paymentsError as PaymentsError {
            // Handle PaymentsError specifically for better error messages
            let appError = paymentsError.asAppError()
            errorMessage = appError.userMessage
            AppLogger.error("Purchase failed: \(paymentsError)", category: AppLogger.feature)
        } catch {
            let appError = AppError.from(error)
            errorMessage = appError.userMessage
            AppLogger.error("Purchase failed (unknown): \(error)", category: AppLogger.feature)
        }
    }
    
    /// Select an offering for purchase
    public func selectOffering(_ offering: PaymentsOffering) {
        selectedOffering = offering
        AppLogger.debug("Selected offering: \(offering.title) - \(offering.price)", category: AppLogger.feature)
    }
    
    /// Restore purchases
    public func restore() async {
        isLoading = true
        errorMessage = nil
        
        defer { isLoading = false }
        
        do {
            // restore() returns the state directly - no race condition
            let restoredState = try await paymentsClient.restore()
            AppLogger.info("Restore successful, isSubscribed: \(restoredState.isSubscribed)", category: AppLogger.feature)
            
            // Update local subscription status immediately
            isSubscribed = restoredState.isSubscribed
            
            if !restoredState.isSubscribed {
                errorMessage = "No active subscription found to restore."
            }
        } catch let paymentsError as PaymentsError {
            // Handle PaymentsError specifically for better error messages
            let appError = paymentsError.asAppError()
            errorMessage = appError.userMessage
            AppLogger.error("Restore failed: \(paymentsError)", category: AppLogger.feature)
        } catch {
            let appError = AppError.from(error)
            errorMessage = appError.userMessage
            AppLogger.error("Restore failed (unknown): \(error)", category: AppLogger.feature)
        }
    }
    
    // MARK: - Private Helpers
    
    private func observePaymentsState() {
        paymentsStateTask?.cancel()
        
        let states = paymentsClient.states()
        
        paymentsStateTask = Task { @MainActor [weak self] in
            guard let self = self else { return }
            
            for await state in states {
                if Task.isCancelled {
                    AppLogger.debug("Payments state observation cancelled", category: AppLogger.feature)
                    break
                }
                
                self.isSubscribed = state.isSubscribed
                AppLogger.debug("Payments state: isSubscribed=\(self.isSubscribed)", category: AppLogger.feature)
            }
        }
    }
}
