//
//  MessagesView.swift
//  TMSDriver
//

import SwiftUI

struct MessagesView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "message.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.secondary)
                Text("Messages")
                    .font(.title2.bold())
                Text("Communicate with your dispatcher. Feature coming soon.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Messages")
        }
    }
}
