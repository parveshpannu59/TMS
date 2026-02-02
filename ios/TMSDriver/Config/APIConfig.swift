//
//  APIConfig.swift
//  TMSDriver
//
//  TMS Driver iOS App - API Configuration
//

import Foundation

enum APIConfig {
    /// Change this to your backend URL for production (App Store)
    /// Development: Use your Mac's IP (e.g. http://192.168.1.100:5000) for device testing
    /// Production: Use your deployed backend (e.g. https://api.yourcompany.com)
    static var baseURL: String {
        #if DEBUG
        return ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:5000/api"
        #else
        return "https://api.yourtms.com/api"  // Replace with your production API URL
        #endif
    }
}
