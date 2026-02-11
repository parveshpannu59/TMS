import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import path from 'path';
import fs from 'fs';

// Dynamic imports for optional deps
let PDFParseLib: any = null;
let TesseractLib: any = null;
try { PDFParseLib = require('pdf-parse'); } catch { /* optional */ }
try { TesseractLib = require('tesseract.js'); } catch { /* optional */ }

// ─── BOL / POD / Invoice Pattern Matchers ────────────────────

const FIELD_PATTERNS: Record<string, RegExp[]> = {
  loadNumber:       [/load\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /load\s*number\s*:?\s*([A-Z0-9\-]+)/i],
  poNumber:         [/p\.?o\.?\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /purchase\s*order\s*:?\s*([A-Z0-9\-]+)/i],
  bolNumber:        [/b\.?o\.?l\.?\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /bill\s*of\s*lading\s*#?\s*:?\s*([A-Z0-9\-]+)/i],
  proNumber:        [/pro\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /pro\s*number\s*:?\s*([A-Z0-9\-]+)/i],
  referenceNumber:  [/ref(?:erence)?\s*#?\s*:?\s*([A-Z0-9\-]+)/i],
  invoiceNumber:    [/invoice\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /inv\.?\s*#?\s*:?\s*([A-Z0-9\-]+)/i],
  shipper:          [/shipper\s*:?\s*(.{3,60})/i, /ship\s*from\s*:?\s*(.{3,60})/i, /origin\s*:?\s*(.{3,60})/i],
  consignee:        [/consignee\s*:?\s*(.{3,60})/i, /ship\s*to\s*:?\s*(.{3,60})/i, /deliver\s*to\s*:?\s*(.{3,60})/i, /receiver\s*:?\s*(.{3,60})/i],
  carrier:          [/carrier\s*:?\s*(.{3,60})/i, /trucking\s*(?:company)?\s*:?\s*(.{3,60})/i],
  driver:           [/driver\s*(?:name)?\s*:?\s*([A-Za-z\s]{3,40})/i],
  truckNumber:      [/truck\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /vehicle\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /unit\s*#?\s*:?\s*([A-Z0-9\-]+)/i],
  trailerNumber:    [/trailer\s*#?\s*:?\s*([A-Z0-9\-]+)/i],
  weight:           [/(?:gross|net|total)?\s*weight\s*:?\s*([\d,]+\.?\d*)\s*(lbs?|kg|tons?)?/i, /(\d[\d,]+\.?\d*)\s*(lbs?|kg|tons?)/i],
  pieces:           [/(\d+)\s*(?:pieces?|pcs?|units?|pallets?|skids?|cartons?|cases?|boxes?)/i, /pieces?\s*:?\s*(\d+)/i],
  commodity:        [/commodity\s*:?\s*(.{3,80})/i, /description\s*(?:of\s*goods?)?\s*:?\s*(.{3,80})/i],
  pickupDate:       [/pick\s*up\s*date\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i, /ship\s*date\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i],
  deliveryDate:     [/deliver(?:y)?\s*date\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i, /due\s*date\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i],
  amount:           [/(?:total|amount|rate|charge)\s*:?\s*\$?([\d,]+\.?\d*)/i, /\$([\d,]+\.?\d{2})/],
  sealNumber:       [/seal\s*#?\s*:?\s*([A-Z0-9\-]+)/i],
  temperature:      [/temp(?:erature)?\s*:?\s*([\-\d.]+)\s*°?([FC])?/i],
};

// Detect document type from content
function detectDocumentType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('bill of lading') || lower.includes('b/l') || lower.includes('bol')) return 'BOL (Bill of Lading)';
  if (lower.includes('proof of delivery') || lower.includes('pod') || lower.includes('delivery receipt')) return 'POD (Proof of Delivery)';
  if (lower.includes('invoice') || lower.includes('billing statement')) return 'Invoice';
  if (lower.includes('rate confirmation') || lower.includes('rate con')) return 'Rate Confirmation';
  if (lower.includes('lumper') || lower.includes('lumper receipt')) return 'Lumper Receipt';
  if (lower.includes('fuel') && (lower.includes('receipt') || lower.includes('purchase'))) return 'Fuel Receipt';
  if (lower.includes('toll') && lower.includes('receipt')) return 'Toll Receipt';
  if (lower.includes('scale ticket') || lower.includes('weigh')) return 'Scale Ticket';
  if (lower.includes('inspection') || lower.includes('dot')) return 'Inspection Report';
  if (lower.includes('insurance') || lower.includes('certificate')) return 'Insurance Certificate';
  if (lower.includes('license') || lower.includes('permit')) return 'License/Permit';
  return 'Transport Document';
}

// Extract structured fields
function extractFields(text: string): Record<string, string> {
  const extracted: Record<string, string> = {};
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let value = match[1].trim();
        // For weight, append unit
        if (field === 'weight' && match[2]) value += ` ${match[2]}`;
        if (field === 'temperature' && match[2]) value += `°${match[2]}`;
        extracted[field] = value;
        break;
      }
    }
  }
  return extracted;
}

// Extract addresses (multi-line patterns)
function extractAddresses(text: string): { from?: string; to?: string } {
  const result: { from?: string; to?: string } = {};

  // Try to find origin/destination patterns
  const fromMatch = text.match(/(?:ship\s*from|origin|pickup|shipper)[:\s]*\n?([\s\S]{10,150}?)(?=\n\s*\n|ship\s*to|consignee|deliver|destination)/i);
  const toMatch = text.match(/(?:ship\s*to|destination|delivery|consignee|deliver\s*to)[:\s]*\n?([\s\S]{10,150}?)(?=\n\s*\n|carrier|driver|seal|sign|date)/i);

  if (fromMatch) result.from = fromMatch[1].replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ').trim();
  if (toMatch) result.to = toMatch[1].replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ').trim();

  return result;
}

// Generate summary
function generateSummary(docType: string, fields: Record<string, string>, addresses: { from?: string; to?: string }): string {
  const parts: string[] = [];
  parts.push(`📄 Document Type: ${docType}`);

  if (fields.shipper || addresses.from) parts.push(`📦 From: ${fields.shipper || addresses.from}`);
  if (fields.consignee || addresses.to) parts.push(`🏁 To: ${fields.consignee || addresses.to}`);
  if (fields.loadNumber) parts.push(`🔢 Load #: ${fields.loadNumber}`);
  if (fields.bolNumber) parts.push(`📋 BOL #: ${fields.bolNumber}`);
  if (fields.poNumber) parts.push(`📝 PO #: ${fields.poNumber}`);
  if (fields.referenceNumber) parts.push(`🔖 Ref #: ${fields.referenceNumber}`);
  if (fields.weight) parts.push(`⚖️ Weight: ${fields.weight}`);
  if (fields.pieces) parts.push(`📦 Pieces: ${fields.pieces}`);
  if (fields.commodity) parts.push(`📋 Commodity: ${fields.commodity}`);
  if (fields.carrier) parts.push(`🚛 Carrier: ${fields.carrier}`);
  if (fields.driver) parts.push(`👤 Driver: ${fields.driver}`);
  if (fields.truckNumber) parts.push(`🚚 Truck #: ${fields.truckNumber}`);
  if (fields.trailerNumber) parts.push(`📎 Trailer #: ${fields.trailerNumber}`);
  if (fields.sealNumber) parts.push(`🔒 Seal #: ${fields.sealNumber}`);
  if (fields.pickupDate) parts.push(`📅 Pickup: ${fields.pickupDate}`);
  if (fields.deliveryDate) parts.push(`📅 Delivery: ${fields.deliveryDate}`);
  if (fields.amount) parts.push(`💰 Amount: $${fields.amount}`);
  if (fields.temperature) parts.push(`🌡️ Temp: ${fields.temperature}`);
  if (fields.invoiceNumber) parts.push(`🧾 Invoice #: ${fields.invoiceNumber}`);

  return parts.join('\n');
}

export class DocumentController {
  // Analyze an uploaded document (PDF or image)
  static analyzeDocument = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded');

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawText = '';

    try {
      if (ext === '.pdf') {
        // ─── PDF Text Extraction (pdf-parse v2.x — pdfjs-dist based) ─────
        if (!PDFParseLib?.PDFParse) throw ApiError.badRequest('PDF parsing library not available');
        const buffer = fs.readFileSync(filePath);
        const parser = new PDFParseLib.PDFParse({ data: new Uint8Array(buffer) });
        await parser.load();

        // Extract text from each page using the underlying pdfjs-dist API
        const pageTexts: string[] = [];
        const pageCount = parser.doc?.numPages || 0;
        for (let i = 1; i <= pageCount; i++) {
          try {
            const page = await parser.doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str || '')
              .join(' ')
              .replace(/\s{2,}/g, ' ')
              .trim();
            if (pageText) pageTexts.push(pageText);
          } catch { /* skip unreadable pages */ }
        }
        rawText = pageTexts.join('\n\n');
        parser.destroy();

        // ─── Scanned PDF Fallback: Use OCR if no text layer found ────
        if (!rawText.trim() && TesseractLib) {
          console.log('📄 PDF has no text layer — falling back to OCR (Tesseract)...');
          const result = await TesseractLib.recognize(filePath, 'eng', { logger: () => {} });
          rawText = result.data.text || '';
        }
      } else if (['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'].includes(ext)) {
        // ─── Image OCR with Tesseract ────
        if (!TesseractLib) throw ApiError.badRequest('OCR library not available');
        const result = await TesseractLib.recognize(filePath, 'eng', {
          logger: () => {},
        });
        rawText = result.data.text || '';
      } else {
        throw ApiError.badRequest(`Unsupported file type: ${ext}. Supported: PDF, JPG, PNG, WEBP`);
      }

      if (!rawText.trim()) {
        return ApiResponse.success(res, {
          documentType: 'Unknown',
          summary: 'Could not extract text from this document. It may be a scanned image with poor quality.',
          extractedFields: {},
          rawText: '',
          confidence: 0,
        }, 'Document analyzed but no text could be extracted');
      }

      // Extract data
      const documentType = detectDocumentType(rawText);
      const extractedFields = extractFields(rawText);
      const addresses = extractAddresses(rawText);
      const summary = generateSummary(documentType, extractedFields, addresses);
      const fieldCount = Object.keys(extractedFields).length + (addresses.from ? 1 : 0) + (addresses.to ? 1 : 0);
      const confidence = Math.min(100, Math.round((fieldCount / 8) * 100));

      return ApiResponse.success(res, {
        documentType,
        summary,
        extractedFields: { ...extractedFields, ...addresses },
        rawText: rawText.substring(0, 3000), // Limit raw text
        confidence,
        wordCount: rawText.split(/\s+/).length,
        pageInfo: ext === '.pdf' ? `PDF document` : `Image (${ext.replace('.', '').toUpperCase()})`,
      }, 'Document analyzed successfully');
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw ApiError.internal(`Failed to analyze document: ${err.message}`);
    }
  });
}
