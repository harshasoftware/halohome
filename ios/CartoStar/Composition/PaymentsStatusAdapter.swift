import Foundation
import Payments
import FeatureChat

/// Adapter that bridges Payments module to FeatureChat's PaymentsStatusProvider protocol
/// This allows FeatureChat to check subscription status without direct dependency on Payments
final class PaymentsStatusAdapter: PaymentsStatusProvider, @unchecked Sendable {
    
    private let paymentsClient: PaymentsClient
    
    init(paymentsClient: PaymentsClient) {
        self.paymentsClient = paymentsClient
    }
    
    func currentState() async -> FeatureChat.PaymentsState {
        let state = await paymentsClient.currentState()
        return FeatureChat.PaymentsState(
            isSubscribed: state.isSubscribed,
            aiQuestionLimit: state.aiQuestionLimit,
            billingPeriodStart: state.billingPeriodStart
        )
    }
}


