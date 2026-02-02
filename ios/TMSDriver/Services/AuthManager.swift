//
//  AuthManager.swift
//  TMSDriver
//

import Foundation
import Combine

final class AuthManager: ObservableObject {
    static let shared = AuthManager()
    private let key = "driver_mobile_auth_v1"
    
    @Published var isAuthenticated = false
    @Published var user: User?
    @Published var token: String?
    
    private init() {
        loadAuth()
    }
    
    func loadAuth() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let auth = try? JSONDecoder().decode(AuthData.self, from: data) else {
            isAuthenticated = false
            user = nil
            token = nil
            return
        }
        token = auth.accessToken
        user = auth.user
        let roleOk = auth.user == nil || auth.user?.role == "driver" || auth.user?.userType == "driver"
        isAuthenticated = !auth.accessToken.isEmpty && roleOk
    }
    
    func saveAuth(accessToken: String, user: User?) {
        let auth = AuthData(accessToken: accessToken, user: user)
        if let data = try? JSONEncoder().encode(auth) {
            UserDefaults.standard.set(data, forKey: key)
        }
        token = accessToken
        self.user = user
        isAuthenticated = true
    }
    
    func clearAuth() {
        UserDefaults.standard.removeObject(forKey: key)
        token = nil
        user = nil
        isAuthenticated = false
    }
}

struct AuthData: Codable {
    let accessToken: String
    let user: User?
}
