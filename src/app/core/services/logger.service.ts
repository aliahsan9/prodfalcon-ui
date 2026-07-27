import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly prefix = '[ProdFalcon]';

  debug(message: string, context?: unknown): void {
    if (!environment.production) {
      this.write('debug', message, context);
    }
  }

  info(message: string, context?: unknown): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: unknown): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: unknown): void {
    const payload = `${this.prefix} ${message}`;
    switch (level) {
      case 'debug':
        console.debug(payload, context ?? '');
        break;
      case 'info':
        console.info(payload, context ?? '');
        break;
      case 'warn':
        console.warn(payload, context ?? '');
        break;
      case 'error':
        console.error(payload, context ?? '');
        break;
    }
  }
}
