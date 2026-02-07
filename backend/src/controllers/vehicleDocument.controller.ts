import { Request, Response } from 'express';
import { VehicleDocument, VehicleDocumentType, DocumentStatus } from '../models/VehicleDocument.model';
import { Vehicle } from '../models/Vehicle.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

/**
 * @desc Get all documents for a vehicle (latest versions only)
 * @route GET /api/vehicles/:vehicleId/documents
 * @access Private
 */
export const getVehicleDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  // Recalculate status based on current date for latest documents
  const docs = await VehicleDocument.find({ vehicleId, isLatest: true }).sort({ documentType: 1 });

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  for (const doc of docs) {
    let newStatus = doc.status;
    if (doc.expiryDate < now) {
      newStatus = DocumentStatus.EXPIRED;
    } else if (doc.expiryDate <= thirtyDaysFromNow) {
      newStatus = DocumentStatus.EXPIRING_SOON;
    } else {
      newStatus = DocumentStatus.ACTIVE;
    }
    if (newStatus !== doc.status) {
      doc.status = newStatus;
      await doc.save();
    }
  }

  return ApiResponse.success(res, docs, 'Vehicle documents fetched successfully');
});

/**
 * @desc Get document history for a vehicle (all versions of a specific doc type)
 * @route GET /api/vehicles/:vehicleId/documents/history
 * @access Private
 */
export const getDocumentHistory = asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const { documentType } = req.query;

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  const query: any = { vehicleId };
  if (documentType) {
    query.documentType = documentType;
  }

  const history = await VehicleDocument.find(query).sort({ documentType: 1, version: -1 });

  return ApiResponse.success(res, history, 'Document history fetched successfully');
});

/**
 * @desc Upload a new document for a vehicle (or replace existing)
 * @route POST /api/vehicles/:vehicleId/documents
 * @access Private
 */
export const uploadVehicleDocumentFile = asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const userId = (req as any).user?.id;
  const companyId = (req as any).user?.companyId || userId;

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const { documentType, expiryDate, issuedDate, notes } = req.body;

  if (!documentType || !Object.values(VehicleDocumentType).includes(documentType)) {
    throw ApiError.badRequest('Invalid document type. Must be: registration, inspection, or title');
  }

  if (!expiryDate) {
    throw ApiError.badRequest('Expiry date is required');
  }

  // Find existing latest version for this document type
  const existingDoc = await VehicleDocument.findOne({
    vehicleId,
    documentType,
    isLatest: true,
  });

  let newVersion = 1;

  if (existingDoc) {
    // Archive the existing version
    existingDoc.isLatest = false;
    existingDoc.status = DocumentStatus.ARCHIVED;
    await existingDoc.save();
    newVersion = existingDoc.version + 1;
  }

  const filePath = `/uploads/vehicle-documents/${req.file.filename}`;

  const newDoc = await VehicleDocument.create({
    vehicleId,
    companyId,
    documentType,
    fileName: req.file.originalname,
    filePath,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    expiryDate: new Date(expiryDate),
    issuedDate: issuedDate ? new Date(issuedDate) : undefined,
    status: DocumentStatus.ACTIVE,
    version: newVersion,
    isLatest: true,
    notes,
    uploadedBy: userId?.toString(),
  });

  return ApiResponse.success(res, newDoc, 'Document uploaded successfully', 201);
});

/**
 * @desc Delete a document (only latest version, archives it)
 * @route DELETE /api/vehicles/:vehicleId/documents/:documentId
 * @access Private
 */
export const deleteVehicleDocument = asyncHandler(async (req: Request, res: Response) => {
  const { vehicleId, documentId } = req.params;

  const document = await VehicleDocument.findOne({ _id: documentId, vehicleId });
  if (!document) {
    throw ApiError.notFound('Document not found');
  }

  // If deleting the latest version, make the previous version the latest
  if (document.isLatest) {
    const previousVersion = await VehicleDocument.findOne({
      vehicleId,
      documentType: document.documentType,
      version: document.version - 1,
    });

    if (previousVersion) {
      previousVersion.isLatest = true;
      // Recalculate status
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (previousVersion.expiryDate < now) {
        previousVersion.status = DocumentStatus.EXPIRED;
      } else if (previousVersion.expiryDate <= thirtyDaysFromNow) {
        previousVersion.status = DocumentStatus.EXPIRING_SOON;
      } else {
        previousVersion.status = DocumentStatus.ACTIVE;
      }
      await previousVersion.save();
    }
  }

  await document.deleteOne();

  return ApiResponse.success(res, null, 'Document deleted successfully');
});

/**
 * @desc Search documents across all vehicles
 * @route GET /api/vehicle-documents/search
 * @access Private
 */
export const searchVehicleDocuments = asyncHandler(async (req: Request, res: Response) => {
  const companyId = (req as any).user?.companyId || (req as any).user?.id;
  const { q, status, documentType } = req.query;

  const query: any = { companyId };

  if (status) {
    query.status = status;
  }
  if (documentType) {
    query.documentType = documentType;
  }

  // If search query provided, find matching vehicles first
  let vehicleIds: string[] | undefined;
  if (q && typeof q === 'string') {
    const searchRegex = new RegExp(q, 'i');
    const matchingVehicles = await Vehicle.find({
      companyId,
      $or: [
        { vehicleName: searchRegex },
        { vin: searchRegex },
        { registrationNumber: searchRegex },
        { unitNumber: searchRegex },
        { make: searchRegex },
        { vehicleModel: searchRegex },
      ],
    }).select('_id');

    vehicleIds = matchingVehicles.map((v) => v._id.toString());
    if (vehicleIds.length === 0) {
      return ApiResponse.success(res, [], 'No documents found');
    }
    query.vehicleId = { $in: vehicleIds };
  }

  const documents = await VehicleDocument.find(query)
    .populate('vehicleId', 'vehicleName vehicleType vin registrationNumber unitNumber')
    .sort({ updatedAt: -1 });

  return ApiResponse.success(res, documents, 'Documents fetched successfully');
});

/**
 * @desc Get expiring documents summary (within next 30 days + already expired)
 * @route GET /api/vehicle-documents/expiring
 * @access Private
 */
export const getExpiringDocuments = asyncHandler(async (req: Request, res: Response) => {
  const companyId = (req as any).user?.companyId || (req as any).user?.id;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDocs = await VehicleDocument.find({
    companyId,
    isLatest: true,
    expiryDate: { $lte: thirtyDaysFromNow },
  })
    .populate('vehicleId', 'vehicleName vehicleType vin registrationNumber')
    .sort({ expiryDate: 1 });

  return ApiResponse.success(res, expiringDocs, 'Expiring documents fetched successfully');
});
