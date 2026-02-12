import { useState, useCallback } from 'react';
import { loadApi } from '@/api/all.api';

export interface OCRResult {
  documentType: string;
  summary: string;
  extractedFields: Record<string, string>;
  rawText: string;
  confidence: number;
}

/**
 * Reusable hook for OCR document analysis.
 * Analyzes uploaded photos/PDFs and returns extracted fields.
 * 
 * Usage:
 *   const { analyze, analyzing, ocrResult, ocrError } = useDocumentOCR();
 *   // After file selected:
 *   const result = await analyze(file);
 *   if (result) { prefill form with result.extractedFields }
 */
export function useDocumentOCR() {
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const analyze = useCallback(async (file: File): Promise<OCRResult | null> => {
    try {
      setAnalyzing(true);
      setOcrError(null);
      setOcrResult(null);

      const result = await loadApi.analyzeDocument(file);
      setOcrResult(result);
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'OCR analysis failed';
      setOcrError(msg);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOcrResult(null);
    setOcrError(null);
    setAnalyzing(false);
  }, []);

  return { analyze, analyzing, ocrResult, ocrError, reset };
}

// ─── Helper: extract a number from OCR text (for mileage, amounts) ────
export function extractNumber(text: string): number | null {
  if (!text) return null;
  // Remove commas, spaces, currency symbols, then find the first large number
  const cleaned = text.replace(/[$€£,\s]/g, '');
  // Look for numbers with 3+ digits (mileage, amounts)
  const matches = cleaned.match(/\d{2,}/g);
  if (matches && matches.length > 0) {
    // Return the largest number found (most likely the mileage or total)
    const numbers = matches.map(Number).filter(n => !isNaN(n));
    return numbers.length > 0 ? Math.max(...numbers) : null;
  }
  return null;
}

// ─── Helper: extract monetary amount from OCR text ────
export function extractAmount(text: string): number | null {
  if (!text) return null;
  // Look for patterns like $123.45, 123.45, $1,234.56
  const patterns = [
    /\$\s*([\d,]+\.?\d*)/g,
    /total[:\s]*([\d,]+\.?\d*)/gi,
    /amount[:\s]*([\d,]+\.?\d*)/gi,
    /due[:\s]*([\d,]+\.?\d*)/gi,
    /([\d,]+\.\d{2})/g,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const amounts = matches
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0);
      if (amounts.length > 0) return Math.max(...amounts);
    }
  }
  return null;
}

// ─── Helper: extract mileage/odometer from OCR text ────
export function extractMileage(text: string): number | null {
  if (!text) return null;
  // Look for odometer-related patterns
  const patterns = [
    /odometer[:\s]*([\d,]+)/gi,
    /mileage[:\s]*([\d,]+)/gi,
    /miles[:\s]*([\d,]+)/gi,
    /odo[:\s]*([\d,]+)/gi,
    /km[:\s]*([\d,]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const nums = matches
        .map(m => parseInt(m[1].replace(/,/g, ''), 10))
        .filter(n => !isNaN(n) && n > 1000); // odometer readings are usually > 1000
      if (nums.length > 0) return nums[0];
    }
  }

  // Fallback: find the largest number that looks like a mileage (5-7 digits)
  const bigNums = text.match(/\b\d{4,7}\b/g);
  if (bigNums) {
    const nums = bigNums.map(Number).filter(n => n > 1000 && n < 9999999);
    if (nums.length > 0) return Math.max(...nums);
  }

  return null;
}
