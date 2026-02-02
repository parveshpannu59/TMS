//
//  TMSDriverApp.swift
//  TMSDriver
//
//  TMS Driver - Native iOS App for App Store
//

import SwiftUI

@main
struct TMSDriverApp: App {
    @StateObject private var auth = AuthManager.shared
    
    var body: some Scene {
        WindowGroup {
            if auth.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
            TripsView()
                .tabItem {
                    Label("Trips", systemImage: "truck.box.fill")
                }
            MessagesView()
                .tabItem {
                    Label("Messages", systemImage: "message.fill")
                }
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
    }
}
