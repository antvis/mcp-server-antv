import { z } from 'zod';

/**
 * Generic schema validator
 * @param schema Zod schema
 * @param args Arguments to validate
 * @returns Validation result
 */
export function validateSchema(
  schema: z.ZodType<any>,
  args: any,
): { success: boolean; errorMessage?: string } {
  try {
    schema.parse(args);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return {
        success: false,
        errorMessage: `Schema validation failed: ${errorMessages.join(', ')}`,
      };
    }
    return {
      success: false,
      errorMessage: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
