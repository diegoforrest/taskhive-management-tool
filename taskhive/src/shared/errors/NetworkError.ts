import { AppError } from './AppError';

export class NetworkError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
    
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}