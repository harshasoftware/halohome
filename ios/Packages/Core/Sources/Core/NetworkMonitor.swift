import Foundation
import Network
import Observation

/// Lightweight network connectivity monitor
@Observable
public final class NetworkMonitor {

    public static let shared = NetworkMonitor()

    /// Whether the device currently has network connectivity
    public private(set) var isConnected: Bool = true

    /// The current connection type (wifi, cellular, etc.)
    public private(set) var connectionType: ConnectionType = .unknown

    public enum ConnectionType: String {
        case wifi
        case cellular
        case wired
        case unknown
    }

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.cartostar.networkmonitor")

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let connected = path.status == .satisfied
            let type: ConnectionType
            if path.usesInterfaceType(.wifi) {
                type = .wifi
            } else if path.usesInterfaceType(.cellular) {
                type = .cellular
            } else if path.usesInterfaceType(.wiredEthernet) {
                type = .wired
            } else {
                type = .unknown
            }

            DispatchQueue.main.async {
                self?.isConnected = connected
                self?.connectionType = type
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}
