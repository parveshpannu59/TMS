//
//  DashboardView.swift
//  TMSDriver
//

import SwiftUI
import PhotosUI

struct DashboardView: View {
    @State private var loads: [Load] = []
    @State private var loading = true
    @State private var error: String?
    @State private var toast: String?
    
    var acceptedLoad: Load? {
        loads.first { ["trip_accepted", "assigned"].contains($0.status ?? "") && !["completed", "cancelled", "delivered"].contains($0.status ?? "") }
    }
    
    var activeLoad: Load? {
        loads.first { ["trip_started", "shipper_check_in", "shipper_load_in", "shipper_load_out", "in_transit", "receiver_check_in", "receiver_offload"].contains($0.status ?? "") }
    }
    
    var displayLoad: Load? { activeLoad ?? acceptedLoad }
    
    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = error {
                    VStack(spacing: 12) {
                        Text(err)
                            .foregroundColor(.red)
                        Button("Retry") { Task { await fetchLoads() } }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let load = displayLoad {
                    LoadCardView(load: load, onRefresh: { Task { await fetchLoads() } })
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "truck.box.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)
                        Text("No Active Trip")
                            .font(.title2.bold())
                        Text("When you accept a load, it will appear here.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("Dashboard")
            .task { await fetchLoads() }
            .refreshable { await fetchLoads() }
            .overlay(alignment: .bottom) {
                if let t = toast {
                    Text(t)
                        .padding()
                        .background(.black.opacity(0.8))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .padding(.bottom, 100)
                        .transition(.opacity)
                }
            }
        }
    }
    
    private func fetchLoads() async {
        loading = true
        error = nil
        defer { loading = false }
        do {
            loads = try await LoadAPI.getMyAssignedLoads()
        } catch let e as APIError {
            error = e.message
        } catch let e as URLError {
            error = e.code == .cannotConnectToHost || e.code == .notConnectedToInternet
                ? "Cannot connect to server. Check API URL and network."
                : e.localizedDescription
        } catch let err {
            error = err.localizedDescription
        }
    }
}

struct LoadCardView: View {
    let load: Load
    let onRefresh: () -> Void
    @State private var showStartTrip = false
    @State private var startMileage = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var photoData: Data?
    
    var statusLabel: String {
        switch load.status {
        case "assigned", "trip_accepted": return "Accepted"
        case "trip_started": return "Trip Started"
        case "shipper_check_in": return "Shipper Check-in"
        case "shipper_load_in": return "Load In"
        case "shipper_load_out": return "Load Out"
        case "in_transit": return "In Transit"
        case "receiver_check_in": return "Receiver Check-in"
        case "receiver_offload": return "Offloaded"
        default: return load.status ?? "—"
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Load #\(load.loadNumber ?? "—")")
                        .font(.title2.bold())
                    Spacer()
                    Text(statusLabel)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(8)
                }
                
                if let pick = load.pickupLocation {
                    HStack {
                        Image(systemName: "mappin.circle.fill")
                            .foregroundColor(.green)
                        Text("\(pick.city ?? ""), \(pick.state ?? "")")
                    }
                }
                if let del = load.deliveryLocation {
                    HStack {
                        Image(systemName: "flag.fill")
                            .foregroundColor(.red)
                        Text("\(del.city ?? ""), \(del.state ?? "")")
                    }
                }
                
                if let rate = load.rate {
                    Text("Rate: $\(Int(rate))")
                        .font(.headline)
                }
                
                if ["assigned", "trip_accepted"].contains(load.status ?? "") {
                    Button("Start Trip") {
                        showStartTrip = true
                    }
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity)
                }
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
            .padding()
        }
        .sheet(isPresented: $showStartTrip) {
            StartTripSheet(
                loadId: load.id,
                startMileage: $startMileage,
                selectedPhoto: $selectedPhoto,
                photoData: $photoData,
                onDismiss: { showStartTrip = false },
                onSuccess: {
                    showStartTrip = false
                    onRefresh()
                }
            )
        }
        .onChange(of: selectedPhoto) { newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self) {
                    photoData = data
                }
            }
        }
    }
}

struct StartTripSheet: View {
    let loadId: String
    @Binding var startMileage: String
    @Binding var selectedPhoto: PhotosPickerItem?
    @Binding var photoData: Data?
    let onDismiss: () -> Void
    let onSuccess: () -> Void
    @State private var loading = false
    @State private var error: String?
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Odometer Photo (Required)") {
                    PhotosPicker(
                        selection: $selectedPhoto,
                        matching: .images,
                        photoLibrary: .shared()
                    ) {
                        if photoData != nil {
                            Label("Photo selected", systemImage: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        } else {
                            Label("Choose Odometer Photo", systemImage: "camera")
                        }
                    }
                }
                Section("Start Mileage") {
                    TextField("Mileage", text: $startMileage)
                        .keyboardType(.decimalPad)
                }
                if let err = error {
                    Section {
                        Text(err).foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Start Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onDismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Start") {
                        Task { await startTrip() }
                    }
                    .disabled(loading || startMileage.isEmpty || photoData == nil)
                }
            }
        }
    }
    
    private func startTrip() async {
        guard let data = photoData, let mileage = Double(startMileage) else {
            error = "Please enter mileage and select a photo"
            return
        }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let photoUrl = try await LoadAPI.uploadDocument(loadId: loadId, imageData: data)
            _ = try await LoadAPI.startTrip(loadId: loadId, startMileage: mileage, startingPhoto: photoUrl)
            onSuccess()
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
