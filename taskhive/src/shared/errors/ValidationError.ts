import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    
    if (field) {
      this.message = `${field}: ${message}`;
    }
  }
}