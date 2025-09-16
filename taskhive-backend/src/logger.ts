import { Logger } from '@nestjs/common';

// Simple centralized logger wrapper so we can avoid using console.* directly
// and easily control production/dev logging levels.
const logger = new Logger('taskhive-backend');

export default logger;

export const log = {
  debug: (message?: any, ...optionalParams: any[]) => logger.debug(String(message), ...optionalParams),
  log: (message?: any, ...optionalParams: any[]) => logger.log(String(message), ...optionalParams),
  warn: (message?: any, ...optionalParams: any[]) => logger.warn(String(message), ...optionalParams),
  error: (message?: any, ...optionalParams: any[]) => logger.error(String(message), ...optionalParams),
};
