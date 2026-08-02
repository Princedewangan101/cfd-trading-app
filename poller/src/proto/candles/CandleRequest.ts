// Original file: src/proto/candle.proto

import type { Long } from '@grpc/proto-loader';

export interface CandleRequest {
  'symbol'?: (string);
  'timeFrame'?: (string);
  'from'?: (number | string | Long);
  'take'?: (number);
}

export interface CandleRequest__Output {
  'symbol': (string);
  'timeFrame': (string);
  'from': (string);
  'take': (number);
}
