//
//  SettingsView.swift
//  TMSDriver
//

import SwiftUI

struct SettingsView: View {
    @StateObject private var auth = AuthManager.shared
    @State private var showLogoutAlert = false
    
    var body: some View {
        NavigationStack {
            List {
                Section("Profile") {
                    HStack {
                        if let user = auth.user {
                            Text(String((user.name ?? "?").prefix(1)).uppercased())
                                .font(.title.bold())
                                .frame(width: 44, height: 44)
                                .background(Color.blue.opacity(0.2))
                                .clipShape(Circle())
                            VStack(alignment: .leading) {
                                Text(user.name ?? "Driver")
                                    .font(.headline)
                                Text(user.email ?? "")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                
                Section {
                    Button(role: .destructive) {
                        showLogoutAlert = true
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Sign Out", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    auth.clearAuth()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}
