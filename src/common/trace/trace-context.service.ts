import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TraceStore {
    correlationId: string;
}

@Injectable()
export class TraceContextService {
    private readonly storage = new AsyncLocalStorage<TraceStore>();

    run<T>(correlationId: string, callback: () => T): T {
        return this.storage.run({ correlationId }, callback);
    }

    getCorrelationId(): string | undefined {
        return this.storage.getStore()?.correlationId;
    }
}