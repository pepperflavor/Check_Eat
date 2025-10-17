import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

// provider 로 등록할 이름, export할때 쓰는 이름임
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisClientProvider: Provider<Redis> = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const host = config.get('REDIS_HOST', 'redis');
    const port = Number(config.get('REDIS_PORT', 6379));
    const password = config.get<string>('REDIS_PASSWORD');
    const db = Number(config.get('LOCK_REDIS_DB', 2)); //0은 캐싱, 1은 bull에서 쓸거, 2를 락으로 설정

    return new IORedis({ host, port, password, db, lazyConnect: false });
  },
};
