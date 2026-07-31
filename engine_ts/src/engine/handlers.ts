import type { NatsConnection } from "nats";
import { SUBJECTS, type CloseOrderRequest, type LimitOrder, type Side, type TpSlOrder } from "../type/type.js";
import { addLimitOrder, livePrices, removeOrderEverywhere, removeUserOrders, tpSlOrderMap } from "./orderBook.js";

export function setupRequestHandlers(nc: NatsConnection) {
    // engine.limitOrder.submit : {orderId, userId, symbol, side, price, quantity, leverage}
    nc.subscribe(SUBJECTS.LIMIT_ORDER_SUBMIT, {
        callback: (err, msg) => {
            if (err) return;
            try {
                const data = JSON.parse(msg.data.toString()) as Partial<LimitOrder>;
                if (!data.orderId || !data.userId || !data.symbol || !data.side || data.price === undefined) {
                    throw new Error("missing required fields in limitOrder.submit");
                }
                addLimitOrder({
                    orderId: data.orderId,
                    userId: data.userId,
                    symbol: data.symbol,
                    side: data.side,
                    price: Number(data.price),
                    quantity: Number(data.quantity ?? 0),
                    leverage: Number(data.leverage ?? 1),
                });
                msg.respond(JSON.stringify({ success: true }));
            } catch (error: any) {
                console.log("ERROR (engine.limitOrder.submit) :", error.message);
                msg.respond(JSON.stringify({ success: false, error: error.message }));
            }
        },
    });

    // engine.order.cancel : {orderId, side}
    nc.subscribe(SUBJECTS.ORDER_CANCEL, {
        callback: (err, msg) => {
            if (err) return;
            try {
                const { orderId, side } = JSON.parse(msg.data.toString()) as { orderId: string; side: Side };
                if (!orderId) throw new Error("missing orderId in order.cancel");
                removeOrderEverywhere(orderId, side);
                msg.respond(JSON.stringify({ success: true }));
            } catch (error: any) {
                console.log("ERROR (engine.order.cancel) :", error.message);
                msg.respond(JSON.stringify({ success: false, error: error.message }));
            }
        },
    });

    // engine.order.tpSl : {orderId, userId, symbol, side, tp, sl}
    nc.subscribe(SUBJECTS.ORDER_TP_SL, {
        callback: (err, msg) => {
            if (err) return;
            try {
                const data = JSON.parse(msg.data.toString()) as Partial<TpSlOrder>;
                if (!data.orderId || !data.userId || !data.symbol || !data.side) {
                    throw new Error("missing required fields in order.tpSl");
                }
                tpSlOrderMap.set(data.orderId, {
                    orderId: data.orderId,
                    userId: data.userId,
                    symbol: data.symbol,
                    side: data.side,
                    tp: data.tp === undefined ? null : Number(data.tp),
                    sl: data.sl === undefined ? null : Number(data.sl),
                    openPrice: Number(data.openPrice ?? 0),
                });
                msg.respond(JSON.stringify({ success: true }));
            } catch (error: any) {
                console.log("ERROR (engine.order.tpSl) :", error.message);
                msg.respond(JSON.stringify({ success: false, error: error.message }));
            }
        },
    });

    // engine.order.close : {id, orderId, symbol} -> reply {success, id, closePrice}
    nc.subscribe(SUBJECTS.ORDER_CLOSE, {
        callback: (err, msg) => {
            if (err) return;
            try {
                const { id, orderId, symbol } = JSON.parse(msg.data.toString()) as CloseOrderRequest;
                const livePrice = livePrices.get(symbol);
                if (livePrice === undefined) {
                    throw new Error(`no live price for ${symbol}`);
                }
                removeOrderEverywhere(orderId, "BUY");
                msg.respond(JSON.stringify({ success: true, id, closePrice: livePrice }));
            } catch (error: any) {
                console.log("ERROR (engine.order.close) :", error.message);
                msg.respond(JSON.stringify({ success: false, error: error.message }));
            }
        },
    });

    // engine.user.closeOrders : {userId}
    nc.subscribe(SUBJECTS.USER_CLOSE_ORDERS, {
        callback: (err, msg) => {
            if (err) return;
            try {
                const { userId } = JSON.parse(msg.data.toString()) as { userId: string };
                if (!userId) throw new Error("missing userId in user.closeOrders");
                removeUserOrders(userId);
                msg.respond(JSON.stringify({ success: true }));
            } catch (error: any) {
                console.log("ERROR (engine.user.closeOrders) :", error.message);
                msg.respond(JSON.stringify({ success: false, error: error.message }));
            }
        },
    });

    console.log("> request handlers registered");
}
