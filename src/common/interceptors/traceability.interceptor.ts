import {
    CallHandler,
    ExecutionContext,
    HttpException,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { randomUUID } from 'node:crypto';

import { Observable, defer } from 'rxjs';
import {
    catchError,
    finalize,
} from 'rxjs/operators';

import { AppLogger } from '../logger/logger.service';
import { TraceContextService } from '../trace/trace-context.service';

@Injectable()
export class TraceabilityInterceptor
    implements NestInterceptor
{
    constructor(
        private readonly logger: AppLogger,
        private readonly traceContext: TraceContextService,
    ) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const httpContext =
            context.switchToHttp();

        const request =
            httpContext.getRequest<Request>();

        const response =
            httpContext.getResponse<Response>();

        const incomingCorrelationId =
            request.header('x-correlation-id');

        const correlationId =
            incomingCorrelationId?.trim() ||
            randomUUID();

        const startTime = Date.now();

        let statusCode = response.statusCode;
        let requestFailed = false;

        request.correlationId =
            correlationId;

        response.setHeader(
            'x-correlation-id',
            correlationId,
        );

        return defer(() =>
            this.traceContext.run(
                correlationId,
                () =>
                    next.handle().pipe(
                        catchError(
                            (error: unknown) => {
                                requestFailed = true;

                                statusCode =
                                    error instanceof
                                    HttpException
                                        ? error.getStatus()
                                        : 500;

                                throw error;
                            },
                        ),

                        finalize(() => {
                            if (!requestFailed) {
                                statusCode =
                                    response.statusCode;
                            }

                            const duration =
                                Date.now() -
                                startTime;

                            const statusText =
                                this.getStatusText(
                                    statusCode,
                                );

                            const route =
                                `${request.method} ${request.originalUrl}`;

                            this.logger.logWithTrace(
                                correlationId,
                                'TRACE',
                                `[TRACE] [${route}] [${statusCode} ${statusText}] [Duration: ${duration}ms] [CorrelationID: ${correlationId}]`,
                            );
                        }),
                    ),
            ),
        );
    }

    private getStatusText(
        statusCode: number,
    ): string {
        const statusTexts: Record<
            number,
            string
        > = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
        };

        return (
            statusTexts[statusCode] ??
            'Unknown'
        );
    }
}