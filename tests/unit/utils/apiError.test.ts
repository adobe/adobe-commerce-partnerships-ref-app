import { ApiError } from '../../../utils/apiError';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create an ApiError with message and status', () => {
      const message = 'Test error message';
      const status = 404;

      const error = new ApiError(message, status);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe(message);
      expect(error.status).toBe(status);
      expect(error.name).toBe('ApiError');
    });

    it('should create an ApiError with message only (defaults to status 500)', () => {
      const message = 'Test error without status';

      const error = new ApiError(message);

      expect(error.message).toBe(message);
      expect(error.status).toBe(500); // Default status
      expect(error.name).toBe('ApiError');
    });

    it('should create an ApiError with empty message', () => {
      const error = new ApiError('');

      expect(error.message).toBe('');
      expect(error.status).toBe(500); // Default status
      expect(error.name).toBe('ApiError');
    });

    it('should handle various HTTP status codes', () => {
      const statusCodes = [400, 401, 403, 404, 500, 502, 503, 504];

      statusCodes.forEach(status => {
        const error = new ApiError(`Error ${status}`, status);
        expect(error.status).toBe(status);
        expect(error.message).toBe(`Error ${status}`);
      });
    });

    it('should handle zero status code', () => {
      const error = new ApiError('Network error', 0);

      expect(error.status).toBe(0);
      expect(error.message).toBe('Network error');
    });

    it('should handle negative status code', () => {
      const error = new ApiError('Invalid status', -1);

      expect(error.status).toBe(-1);
      expect(error.message).toBe('Invalid status');
    });
  });

  describe('inheritance', () => {
    it('should inherit from Error correctly', () => {
      const error = new ApiError('Test inheritance');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiError).toBe(true);
      expect(Object.prototype.toString.call(error)).toBe('[object Error]');
    });

    it('should have proper stack trace', () => {
      const error = new ApiError('Test stack trace', 500);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
      expect(error.stack).toContain('Test stack trace');
    });

    it('should be catchable as Error', () => {
      expect(() => {
        throw new ApiError('Test catchable', 400);
      }).toThrow(Error);
    });

    it('should be catchable as ApiError specifically', () => {
      expect(() => {
        throw new ApiError('Test specific catch', 401);
      }).toThrow(ApiError);
    });
  });

  describe('serialization', () => {
    it('should be JSON serializable', () => {
      const error = new ApiError('Serialization test', 422);

      const serialized = JSON.stringify({
        error: error.message,
        status: error.status,
        name: error.name,
      });

      const parsed = JSON.parse(serialized);
      expect(parsed.error).toBe('Serialization test');
      expect(parsed.status).toBe(422);
      expect(parsed.name).toBe('ApiError');
    });

    it('should maintain properties after serialization/deserialization', () => {
      const originalError = new ApiError('Original message', 503);

      // Simulate what might happen in API responses
      const errorData = {
        message: originalError.message,
        status: originalError.status,
        name: originalError.name,
      };

      const reconstructedError = new ApiError(errorData.message, errorData.status);

      expect(reconstructedError.message).toBe(originalError.message);
      expect(reconstructedError.status).toBe(originalError.status);
      expect(reconstructedError.name).toBe(originalError.name);
    });
  });

  describe('toString behavior', () => {
    it('should convert to string properly', () => {
      const error = new ApiError('String conversion test', 400);

      const stringified = error.toString();
      expect(stringified).toContain('ApiError');
      expect(stringified).toContain('String conversion test');
    });

    it('should work with template literals', () => {
      const error = new ApiError('Template literal test', 404);

      const message = `Error occurred: ${error}`;
      expect(message).toContain('Template literal test');
    });
  });

  describe('comparison and equality', () => {
    it('should compare errors by message and status', () => {
      const error1 = new ApiError('Same message', 400);
      const error2 = new ApiError('Same message', 400);
      const error3 = new ApiError('Different message', 400);
      const error4 = new ApiError('Same message', 500);

      expect(error1.message).toBe(error2.message);
      expect(error1.status).toBe(error2.status);

      expect(error1.message).not.toBe(error3.message);
      expect(error1.status).not.toBe(error4.status);
    });

    it('should handle different status codes in comparisons', () => {
      const errorWithStatus = new ApiError('With status', 400);
      const errorWithDefaultStatus = new ApiError('Without explicit status');

      expect(errorWithStatus.status).toBe(400);
      expect(errorWithDefaultStatus.status).toBe(500); // Default status
      expect(errorWithStatus.status).not.toBe(errorWithDefaultStatus.status);
    });
  });

  describe('edge cases', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new ApiError(longMessage, 413);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
      expect(error.status).toBe(413);
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Error with special chars: !@#$%^&*()[]{}|;\':",./<>?`~';
      const error = new ApiError(specialMessage, 400);

      expect(error.message).toBe(specialMessage);
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Error with unicode: 中文';
      const error = new ApiError(unicodeMessage, 400);

      expect(error.message).toBe(unicodeMessage);
    });

    it('should handle null and undefined inputs gracefully', () => {
      // TypeScript would normally prevent this, but testing runtime behavior
      const errorWithNull = new ApiError(null as any);
      const errorWithUndefined = new ApiError(undefined as any);

      expect(errorWithNull.message).toBe('null');
      expect(errorWithUndefined.message).toBe(''); // undefined becomes empty string
    });
  });

  describe('usage in catch blocks', () => {
    it('should work properly in instanceof checks', () => {
      try {
        throw new ApiError('Test instance check', 500);
      } catch (error) {
        expect(error instanceof ApiError).toBe(true);
        expect(error instanceof Error).toBe(true);

        if (error instanceof ApiError) {
          expect(error.status).toBe(500);
          expect(error.message).toBe('Test instance check');
        }
      }
    });

    it('should differentiate from regular Error', () => {
      const apiError = new ApiError('API Error', 400);
      const regularError = new Error('Regular Error');

      expect(apiError instanceof ApiError).toBe(true);
      expect(apiError instanceof Error).toBe(true);

      expect(regularError instanceof ApiError).toBe(false);
      expect(regularError instanceof Error).toBe(true);
    });

    it('should handle error checking patterns', () => {
      function handleError(error: unknown) {
        if (error instanceof ApiError) {
          return { type: 'api', message: error.message, status: error.status };
        } else if (error instanceof Error) {
          return { type: 'generic', message: error.message, status: undefined };
        } else {
          return { type: 'unknown', message: 'Unknown error', status: undefined };
        }
      }

      const apiError = new ApiError('API failure', 503);
      const regularError = new Error('Regular failure');
      const stringError = 'String error';

      expect(handleError(apiError)).toEqual({
        type: 'api',
        message: 'API failure',
        status: 503,
      });

      expect(handleError(regularError)).toEqual({
        type: 'generic',
        message: 'Regular failure',
        status: undefined,
      });

      expect(handleError(stringError)).toEqual({
        type: 'unknown',
        message: 'Unknown error',
        status: undefined,
      });
    });
  });
});
