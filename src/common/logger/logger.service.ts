import { Injectable, LoggerService, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { TraceContextService } from '../trace/trace-context.service';

@Injectable()
export class AppLogger implements LoggerService, OnModuleDestroy {
    private readonly logStream: fs.WriteStream;

    constructor(private readonly traceContext: TraceContextService) {
        const dateStamp = new Date().toISOString().split('T')[0];
        const logDir = path.join(process.cwd(), 'logs');

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, `app-${dateStamp}.log`);

        this.logStream = fs.createWriteStream(logFile, {
            flags: 'a',
        });
    }

    log(message: unknown, context?: string): void {
        this.write('LOG', message, undefined, context);
    }

    fatal(message: unknown, context?: string): void {
        this.write('FATAL', message, undefined, context);
    }

    error(message: unknown, trace?: string, context?: string): void {
        this.write('ERROR', message, trace, context);
    }

    warn(message: unknown, context?: string): void {
        this.write('WARN', message, undefined, context);
    }

    debug(message: unknown, context?: string): void {
        this.write('DEBUG', message, undefined, context);
    }

    verbose(message: unknown, context?: string): void {
        this.write('VERBOSE', message, undefined, context);
    }

    logWithTrace(
        correlationId: string,
        level: string,
        message: string,
    ): void {
        this.write(
            level,
            message,
            undefined,
            undefined,
            correlationId,
        );
    }

    private write(
        level: string,
        message: unknown,
        trace?: string,
        context?: string,
        explicitCorrelationId?: string,
    ): void {
        const timestamp = new Date().toISOString();

        const correlationId =
            explicitCorrelationId ??
            this.traceContext.getCorrelationId();

        const contextPart = context
            ? ` [Context: ${context}]`
            : '';

        const correlationPart = correlationId
            ? ` [CorrelationID: ${correlationId}]`
            : '';

        const formattedLog =
            `[${timestamp}] [${level}]${contextPart}${correlationPart} ${String(message)}` +
            (trace
                ? `\n[Stack Trace]: ${trace}`
                : '') +
            '\n';

        this.logStream.write(formattedLog);

        process.stdout.write(
            `${formattedLog.trim()}\n`,
        );
    }

    onModuleDestroy(): void {
        this.logStream.end();
    }
}