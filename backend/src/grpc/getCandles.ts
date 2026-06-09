import grpcClient from "./client";

export async function getCandles(symbol: string, timeFrame: string) {
    return new Promise((resolve, reject) => {
        grpcClient.GetCandles({ symbol, timeFrame }, (error, response) => {
            if (error) {
                console.log("> ERROR (grpcClient.GetCandles) :", error.message);
                reject(error.message)
            }
            resolve(response)
        })
    })
}