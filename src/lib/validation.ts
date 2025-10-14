/**
 * Input validation schemas using Zod
 * 
 * Provides consistent validation across the app with helpful error messages
 */

import { z } from 'zod';

/**
 * Project name validation
 */
export const projectNameSchema = z.string()
  .trim()
  .min(1, { message: "Project name is required" })
  .max(100, { message: "Project name must be less than 100 characters" })
  .regex(/^[a-zA-Z0-9\s\-_()]+$/, { 
    message: "Project name can only contain letters, numbers, spaces, and basic punctuation" 
  });

/**
 * Track name validation
 */
export const trackNameSchema = z.string()
  .trim()
  .min(1, { message: "Track name is required" })
  .max(100, { message: "Track name must be less than 100 characters" })
  .regex(/^[a-zA-Z0-9\s\-_()]+$/, { 
    message: "Track name can only contain letters, numbers, spaces, and basic punctuation" 
  });

/**
 * Recording name validation
 */
export const recordingNameSchema = z.string()
  .trim()
  .max(100, { message: "Recording name must be less than 100 characters" })
  .regex(/^[a-zA-Z0-9\s\-_()]*$/, { 
    message: "Recording name can only contain letters, numbers, spaces, and basic punctuation" 
  });

/**
 * BPM validation
 */
export const bpmSchema = z.number()
  .int({ message: "BPM must be a whole number" })
  .min(30, { message: "BPM must be at least 30" })
  .max(300, { message: "BPM must be at most 300" });

/**
 * Volume validation (0-1)
 */
export const volumeSchema = z.number()
  .min(0, { message: "Volume must be between 0 and 1" })
  .max(1, { message: "Volume must be between 0 and 1" });

/**
 * Time signature validation
 */
export const timeSignatureSchema = z.object({
  beatsPerMeasure: z.number()
    .int({ message: "Beats per measure must be a whole number" })
    .min(1, { message: "Beats per measure must be at least 1" })
    .max(16, { message: "Beats per measure must be at most 16" }),
  beatUnit: z.number()
    .int({ message: "Beat unit must be a whole number" })
    .refine(val => [2, 4, 8, 16].includes(val), {
      message: "Beat unit must be 2, 4, 8, or 16"
    })
});

/**
 * Safe parse helpers that return validation results
 */
export const validation = {
  /**
   * Validate and return result with formatted error message
   */
  parse<T>(schema: z.ZodSchema<T>, value: unknown): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(value);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { 
      success: false, 
      error: result.error.errors[0]?.message || 'Validation failed' 
    };
  },

  /**
   * Validate or throw
   */
  assert<T>(schema: z.ZodSchema<T>, value: unknown, fieldName: string = 'Value'): T {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(`${fieldName}: ${result.error.errors[0]?.message || 'Validation failed'}`);
    }
    return result.data;
  },

  /**
   * Sanitize HTML to prevent XSS
   */
  sanitizeHtml(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Sanitize filename for safe file operations
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s\-_()]/g, '') // Remove special chars
      .replace(/\s+/g, '_')                // Replace spaces with underscores
      .substring(0, 100);                  // Limit length
  },

  /**
   * Validate file size (in bytes)
   */
  validateFileSize(sizeBytes: number, maxMB: number = 500): { valid: boolean; error?: string } {
    const maxBytes = maxMB * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      return { 
        valid: false, 
        error: `File size must be less than ${maxMB}MB (current: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB)` 
      };
    }
    return { valid: true };
  }
};

// Export schemas for direct use
export { z };
