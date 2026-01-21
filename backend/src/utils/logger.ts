/**
 * Structured logger with levels, timestamps, and context.
 * Production-ready logging without external dependencies.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    jobId?: string;
    url?: string;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private minLevel: LogLevel;

    constructor(minLevel: LogLevel = 'info') {
        this.minLevel = minLevel;
    }

    setLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
    }

    private formatEntry(entry: LogEntry): string {
        const { timestamp, level, message, context } = entry;
        const levelStr = level.toUpperCase().padEnd(5);
        let output = `[${timestamp}] ${levelStr} ${message}`;

        if (context && Object.keys(context).length > 0) {
            output += ` ${JSON.stringify(context)}`;
        }

        return output;
    }

    private log(level: LogLevel, message: string, context?: LogContext): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };

        const formatted = this.formatEntry(entry);

        switch (level) {
            case 'error':
                console.error(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            default:
                console.log(formatted);
        }
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    error(message: string, context?: LogContext): void {
        this.log('error', message, context);
    }

    child(defaultContext: LogContext): ChildLogger {
        return new ChildLogger(this, defaultContext);
    }
}

class ChildLogger {
    constructor(
        private parent: Logger,
        private defaultContext: LogContext
    ) { }

    private mergeContext(context?: LogContext): LogContext {
        return { ...this.defaultContext, ...context };
    }

    debug(message: string, context?: LogContext): void {
        this.parent.debug(message, this.mergeContext(context));
    }

    info(message: string, context?: LogContext): void {
        this.parent.info(message, this.mergeContext(context));
    }

    warn(message: string, context?: LogContext): void {
        this.parent.warn(message, this.mergeContext(context));
    }

    error(message: string, context?: LogContext): void {
        this.parent.error(message, this.mergeContext(context));
    }
}

// Singleton logger instance
export const logger = new Logger(
    process.env['NODE_ENV'] === 'development' ? 'debug' : 'info'
);

export default logger;
