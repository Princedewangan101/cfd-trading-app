import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { Candle as _candles_Candle, Candle__Output as _candles_Candle__Output } from './candles/Candle';
import type { CandleRequest as _candles_CandleRequest, CandleRequest__Output as _candles_CandleRequest__Output } from './candles/CandleRequest';
import type { CandleResponse as _candles_CandleResponse, CandleResponse__Output as _candles_CandleResponse__Output } from './candles/CandleResponse';
import type { CandleServiceClient as _candles_CandleServiceClient, CandleServiceDefinition as _candles_CandleServiceDefinition } from './candles/CandleService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  candles: {
    Candle: MessageTypeDefinition<_candles_Candle, _candles_Candle__Output>
    CandleRequest: MessageTypeDefinition<_candles_CandleRequest, _candles_CandleRequest__Output>
    CandleResponse: MessageTypeDefinition<_candles_CandleResponse, _candles_CandleResponse__Output>
    CandleService: SubtypeConstructor<typeof grpc.Client, _candles_CandleServiceClient> & { service: _candles_CandleServiceDefinition }
  }
}

