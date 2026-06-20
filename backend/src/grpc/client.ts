import * as protoLoader from '@grpc/proto-loader'
import * as grpc from '@grpc/grpc-js'
import type { ProtoGrpcType } from '../proto/candle';

const packageDefination = protoLoader.loadSync('src/proto/candle.proto', {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
})

const proto = grpc.loadPackageDefinition(packageDefination) as unknown as ProtoGrpcType;
const client = new proto.candles.CandleService("localhost:50051", grpc.credentials.createInsecure())

export default client;
