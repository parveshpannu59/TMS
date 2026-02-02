//
//  TripsView.swift
//  TMSDriver
//

import SwiftUI

struct TripsView: View {
    @State private var loads: [Load] = []
    @State private var loading = true
    @State private var error: String?
    
    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = error {
                    VStack(spacing: 12) {
                        Text(err).foregroundColor(.red)
                        Button("Retry") { Task { await fetch() } }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if loads.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("No Trips")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(loads) { load in
                        TripRowView(load: load)
                    }
                }
            }
            .navigationTitle("Trips")
            .task { await fetch() }
            .refreshable { await fetch() }
        }
    }
    
    private func fetch() async {
        loading = true
        error = nil
        defer { loading = false }
        do {
            loads = try await LoadAPI.getMyAssignedLoads()
        } catch let e as APIError {
            error = e.message
        } catch let e as URLError {
            error = e.code == .cannotConnectToHost || e.code == .notConnectedToInternet
                ? "Cannot connect to server."
                : e.localizedDescription
        } catch let err {
            error = err.localizedDescription
        }
    }
}

struct TripRowView: View {
    let load: Load
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Load #\(load.loadNumber ?? "—")")
                    .font(.headline)
                Spacer()
                Text(load.status ?? "—")
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(4)
            }
            if let pick = load.pickupLocation, let del = load.deliveryLocation {
                Text("\(pick.city ?? "") → \(del.city ?? "")")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            if let rate = load.rate {
                Text("$\(Int(rate))")
                    .font(.subheadline.bold())
            }
        }
        .padding(.vertical, 4)
    }
}
