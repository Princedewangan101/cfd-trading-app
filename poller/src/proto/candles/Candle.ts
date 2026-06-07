// Original file: proto/candle.proto

import type { Long } from '@grpc/proto-loader';

export interface Candle {
  'eventType'?: (string);
  'eventTime'?: (number | string | Long);
  'symbol'?: (string);
  'openTime'?: (string);
  'closeTime'?: (string);
  'openPrice'?: (string);
  'closePrice'?: (string);
  'highPrice'?: (string);
  'lowPrice'?: (string);
  'volume'?: (string);
  'isClose'?: (string);
  'noOfTrade'?: (number);
  'candleStickId'?: (string);
}

export interface Candle__Output {
  'eventType': (string);
  'eventTime': (string);
  'symbol': (string);
  'openTime': (string);
  'closeTime': (string);
  'openPrice': (string);
  'closePrice': (string);
  'highPrice': (string);
  'lowPrice': (string);
  'volume': (string);
  'isClose': (string);
  'noOfTrade': (number);
  'candleStickId': (string);
}
