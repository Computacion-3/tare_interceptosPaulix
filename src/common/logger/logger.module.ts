import { Global, Module } from '@nestjs/common';

import { TraceabilityInterceptor } from '../interceptors/traceability.interceptor';
import { TraceContextService } from '../trace/trace-context.service';

import { AppLogger } from './logger.service';

@Global()
@Module({
    providers: [
        TraceContextService,
        AppLogger,
        TraceabilityInterceptor,
    ],
    exports: [
        TraceContextService,
        AppLogger,
        TraceabilityInterceptor,
    ],
})
export class LoggerModule {}