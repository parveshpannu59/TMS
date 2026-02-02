//
//  LoginView.swift
//  TMSDriver
//

import SwiftUI

struct LoginView: View {
    @StateObject private var auth = AuthManager.shared
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var error: String?
    @FocusState private var focused: Bool
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.13, green: 0.83, blue: 0.93).opacity(0.3),
                    Color(red: 0.2, green: 0.83, blue: 0.6).opacity(0.3)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Spacer()
                Text("Driver Sign In")
                    .font(.title.bold())
                    .foregroundColor(.primary)
                
                VStack(spacing: 12) {
                    TextField("Email or Phone", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .focused($focused)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .focused($focused)
                    
                    if let err = error {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                    
                    Button {
                        Task { await login() }
                    } label: {
                        if loading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            Text("Sign In")
                                .frame(maxWidth: .infinity)
                                .padding()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(loading || email.isEmpty || password.isEmpty)
                }
                .padding(24)
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(radius: 8)
                .padding(.horizontal, 32)
                
                Text("Mobile-only driver access")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
            }
        }
    }
    
    private func login() async {
        error = nil
        loading = true
        defer { loading = false }
        do {
            let (token, user) = try await AuthAPI.login(email: email, password: password)
            auth.saveAuth(accessToken: token, user: user)
        } catch let e as APIError {
            error = e.message
        } catch let e as URLError {
            error = e.code == .cannotConnectToHost || e.code == .notConnectedToInternet
                ? "Cannot connect. Check API URL in APIConfig and that backend is running."
                : e.localizedDescription
        } catch let err {
            error = err.localizedDescription
        }
    }
}
