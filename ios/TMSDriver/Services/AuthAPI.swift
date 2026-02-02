//
//  AuthAPI.swift
//  TMSDriver
//

import Foundation

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct LoginData: Decodable {
    let token: String?
    let user: User?
}

struct AuthAPI {
    static func login(email: String, password: String) async throws -> (token: String, user: User?) {
        let body = LoginRequest(email: email, password: password)
        let res: LoginData = try await APIClient.shared.request("/auth/login", method: "POST", body: body)
        let token = res.token ?? ""
        let user = res.user
        if token.isEmpty { throw APIError(message: "Missing access token", statusCode: nil) }
        let role = user?.role ?? user?.userType ?? ""
        if !role.isEmpty && role != "driver" {
            throw APIError(message: "Only driver accounts can sign in here", statusCode: nil)
        }
        return (token, user)
    }
}
