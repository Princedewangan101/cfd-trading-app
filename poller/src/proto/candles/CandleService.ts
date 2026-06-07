// Original file: proto/candle.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CandleRequest as _candles_CandleRequest, CandleRequest__Output as _candles_CandleRequest__Output } from './CandleRequest';
import type { CandleResponse as _candles_CandleResponse, CandleResponse__Output as _candles_CandleResponse__Output } from './CandleResponse';

export interface CandleServiceClient extends grpc.Client {
  GetCandles(argument: _candles_CandleRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  GetCandles(argument: _candles_CandleRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  GetCandles(argument: _candles_CandleRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  GetCandles(argument: _candles_CandleRequest, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  getCandles(argument: _candles_CandleRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  getCandles(argument: _candles_CandleRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  getCandles(argument: _candles_CandleRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  getCandles(argument: _candles_CandleRequest, callback: grpc.requestCallback<_candles_CandleResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface CandleServiceHandlers extends grpc.UntypedServiceImplementation {
  GetCandles: grpc.handleUnaryCall<_candles_CandleRequest__Output, _candles_CandleResponse>;
  
}

export interface CandleServiceDefinition extends grpc.ServiceDefinition {
  GetCandles: MethodDefinition<_candles_CandleRequest, _candles_CandleResponse, _candles_CandleRequest__Output, _candles_CandleResponse__Output>
}
