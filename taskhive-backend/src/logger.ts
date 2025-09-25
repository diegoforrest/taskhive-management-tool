import { Logger } from '@nestjs/common';


const logger = new Logger('taskhive-backend');

export default logger;

export const log = {
  debug: (message?: any, ...optionalParams: any[]) => logger.debug(String(message), ...optionalParams),
  log: (message?: any, ...optionalParams: any[]) => logger.log(String(message), ...optionalParams),
  warn: (message?: any, ...optionalParams: any[]) => logger.warn(String(message), ...optionalParams),
  error: (message?: any, ...optionalParams: any[]) => logger.error(String(message), ...optionalParams),
};
