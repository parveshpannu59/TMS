//
//  User.swift
//  TMSDriver
//

import Foundation

struct User: Codable {
    let _id: String?
    let id: String?
    let name: String?
    let email: String?
    let role: String?
    let userType: String?
    let profilePicture: String?
    
    var userId: String { id ?? _id ?? "" }
}
