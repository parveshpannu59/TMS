//
//  Load.swift
//  TMSDriver
//

import Foundation

struct Location: Codable {
    let city: String?
    let state: String?
    let address: String?
}

struct Load: Codable, Identifiable {
    let _id: String?
    let loadNumber: String?
    let status: String?
    let pickupLocation: Location?
    let deliveryLocation: Location?
    let pickupDate: String?
    let deliveryDate: String?
    let expectedDeliveryDate: String?
    let rate: Double?
    let miles: Double?
    let distance: Double?
    
    var id: String { _id ?? "" }
}
