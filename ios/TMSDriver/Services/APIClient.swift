//
//  APIClient.swift
//  TMSDriver
//

import Foundation

struct APIError: Error {
    let message: String
    let statusCode: Int?
}

final class APIClient {
    static let shared = APIClient()
    
    private var session: URLSession
    private let baseURL: String
    
    private init() {
        self.baseURL = APIConfig.baseURL
        self.session = URLSession.shared
    }
    
    func token() -> String? {
        AuthManager.shared.token
    }
    
    func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path.hasPrefix("/") ? "" : "/")\(path)") else {
            throw APIError(message: "Invalid URL", statusCode: nil)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = token() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try? JSONEncoder().encode(AnyEncodable(body))
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "Invalid response", statusCode: nil)
        }
        
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode(ErrorResponse.self, from: data))?.displayMessage ?? String(data: data, encoding: .utf8) ?? "Request failed"
            throw APIError(message: msg, statusCode: http.statusCode)
        }
        
        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }
        
        do {
            let decoded = try JSONDecoder().decode(APIResponse<T>.self, from: data)
            return decoded.data
        } catch {
            throw APIError(message: "Invalid response: \(error.localizedDescription)", statusCode: http.statusCode)
        }
    }
    
    func upload<T: Decodable>(_ path: String, imageData: Data) async throws -> T {
        let base = baseURL
        guard let url = URL(string: "\(base)\(path.hasPrefix("/") ? "" : "/")\(path)") else {
            throw APIError(message: "Invalid URL", statusCode: nil)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = token() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (filename, mimeType) = Self.detectImageType(imageData)
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "Invalid response", statusCode: nil)
        }
        if http.statusCode >= 400 {
            let msg = (try? JSONDecoder().decode(ErrorResponse.self, from: data))?.displayMessage ?? String(data: data, encoding: .utf8) ?? "Upload failed"
            throw APIError(message: msg, statusCode: http.statusCode)
        }
        do {
            let decoded = try JSONDecoder().decode(APIResponse<T>.self, from: data)
            return decoded.data
        } catch {
            throw APIError(message: "Upload failed: \(error.localizedDescription)", statusCode: http.statusCode)
        }
    }
    
    private static func detectImageType(_ data: Data) -> (filename: String, mimeType: String) {
        if data.count >= 3, data[0] == 0xFF, data[1] == 0xD8 {
            return ("photo.jpg", "image/jpeg")
        }
        if data.count >= 8, data[0] == 0x89, data[1] == 0x50, data[2] == 0x4E {
            return ("photo.png", "image/png")
        }
        return ("photo.jpg", "image/jpeg")
    }
}

struct APIResponse<T: Decodable>: Decodable {
    let data: T
    let success: Bool?
}

struct ErrorResponse: Decodable {
    let message: String?
    let error: String?
    var displayMessage: String? { message ?? error }
}

struct EmptyResponse: Codable {}

struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
