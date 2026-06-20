// Original file: src/proto/candle.proto

import type { Long } from '@grpc/proto-loader';

export interface Candle {
  'candleStickId'?: (string);
  'symbol'?: (string);
  'timeFrame'?: (string);
  'time'?: (number | string | Long);
  'open'?: (number | string);
  'close'?: (number | string);
  'high'?: (number | string);
  'low'?: (number | string);
  'volume'?: (number | string);
}

export interface Candle__Output {
  'candleStickId': (string);
  'symbol': (string);
  'timeFrame': (string);
  'time': (string);
  'open': (number);
  'close': (number);
  'high': (number);
  'low': (number);
  'volume': (number);
}
