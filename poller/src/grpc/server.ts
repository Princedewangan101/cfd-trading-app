import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from '../proto/candle';
import { grpcService } from './getCandles';

export function initGrpc(server: any) {
    const packageDefination = protoLoader.loadSync("src/proto/candle.proto", {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefination)

    server.addService(proto.candles.CandleService.service, grpcService)

    server.bindAsync("0.0.0.0:50051", grpc.ServerCredentials.createInsecure(), (err: any, port: any) => {
        if (err) {
            console.error(`> Server failed to bind: ${err.message}`);
            return;
        }
        console.log(`> gRPC server listening on port = ${port}`);
    })


}