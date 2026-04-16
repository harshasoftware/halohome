import SwiftUI
import DesignSystem

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "globe.americas.fill")
                    .font(.system(size: 44))
                Text("HaloHome")
                    .font(.acWordmark)
                Text("Your Cosmic Map")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .navigationTitle("Home")
        }
    }
}

#Preview {
    ContentView()
}
