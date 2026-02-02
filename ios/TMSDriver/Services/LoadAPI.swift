//
//  LoadAPI.swift
//  TMSDriver
//

import Foundation

struct UploadResponse: Decodable {
    let url: String?
}

struct LoadAPI {
    static func getMyAssignedLoads() async throws -> [Load] {
        let loads: [Load] = try await APIClient.shared.request("/loads/me/assigned")
        return loads
    }
    
    static func getLoad(id: String) async throws -> Load {
        try await APIClient.shared.request("/loads/\(id)")
    }
    
    static func acceptTrip(loadId: String) async throws -> Load {
        try await APIClient.shared.request("/loads/\(loadId)/accept-trip", method: "POST")
    }
    
    static func updateStatus(loadId: String, status: String) async throws -> Load {
        struct StatusBody: Encodable {
            let status: String
        }
        return try await APIClient.shared.request("/loads/\(loadId)/status", method: "PATCH", body: StatusBody(status: status))
    }
    
    static func uploadDocument(loadId: String, imageData: Data) async throws -> String {
        let res: UploadResponse = try await APIClient.shared.upload("/loads/\(loadId)/upload-document", imageData: imageData)
        guard let url = res.url else { throw APIError(message: "No URL returned", statusCode: nil) }
        return url
    }
    
    static func startTrip(loadId: String, startMileage: Double, startingPhoto: String) async throws -> Load {
        struct StartBody: Encodable {
            let startingMileage: Double
            let startingPhoto: String
        }
        return try await APIClient.shared.request("/loads/\(loadId)/start-trip", method: "POST", body: StartBody(startingMileage: startMileage, startingPhoto: startingPhoto))
    }
}
