package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"engine-go/config"
	"engine-go/types"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

func main() {
	go limitOrderMatcher()
	orderCloseExecutor()
}

func printTime() {
	now := time.Now()
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		log.Printf("ERROR loading location: %v", err)
		return
	}
	fmt.Printf("[IST] Current Time: %s\n", now.In(loc).Format("03:04:05 PM"))
}

func limitOrderMatcher() {
	var blimitOrders []types.Order
	var slimitOrders []types.Order

	for {
		removingOrdersWhoseBalanceNearToZero(&blimitOrders, &slimitOrders)
		limitOrderIntoArray(&blimitOrders, &slimitOrders)
		removeOrderFromArray(&blimitOrders, &slimitOrders)
		executingLimitOrders(&blimitOrders, &slimitOrders)
	}
}

func removingOrdersWhoseBalanceNearToZero(blimitOrders, slimitOrders *[]types.Order) {
	val, err := config.RedisClient.RPop(ctx, types.OrderCloseBecauseOfLowBalance).Result()
	if err == redis.Nil {
		fmt.Println("error: removingOrdersWhoseBalanceNearToZero() ") 
		return
	}
	if err != nil {
		log.Printf("error: removingOrdersWhoseBalanceNearToZero: %v", err)
		return
	}

	var user struct {
		UserId string `json:"userId"`
	}
	if err := json.Unmarshal([]byte(val), &user); err != nil {
		log.Printf("error: parsing orderCloseBecauseOfLowBalance: %v", err)
		return
	}

	var filteredBuy []types.Order
	for _, o := range *blimitOrders {
		if o.UserId != user.UserId {
			filteredBuy = append(filteredBuy, o)
		}
	}
	*blimitOrders = filteredBuy

	var filteredSell []types.Order
	for _, o := range *slimitOrders {
		if o.UserId == user.UserId {
			filteredSell = append(filteredSell, o)
		}
	}
	*slimitOrders = filteredSell
}

func makingBatchUsersWhoseBalanceNearToZero(blimitOrders, slimitOrders *[]types.Order) {
	val, err := config.RedisClient.RPop(ctx, types.OrderCloseBecauseOfLowBalance).Result()
	if err == redis.Nil {
		fmt.Println("error: removingOrdersWhoseBalanceNearToZero() ") 
		return
	}
	if err != nil {
		log.Printf("error: removingOrdersWhoseBalanceNearToZero: %v", err)
		return
	}

	var user struct {
		UserId string `json:"userId"`
	}
	if err := json.Unmarshal([]byte(val), &user); err != nil {
		log.Printf("error: parsing orderCloseBecauseOfLowBalance: %v", err)
		return
	}

	var filteredBuy []types.Order
	for _, o := range *blimitOrders {
		if o.UserId != user.UserId {
			filteredBuy = append(filteredBuy, o)
		}
	}
	*blimitOrders = filteredBuy

	var filteredSell []types.Order
	for _, o := range *slimitOrders {
		if o.UserId == user.UserId {
			filteredSell = append(filteredSell, o)
		}
	}
	*slimitOrders = filteredSell
}


func limitOrderIntoArray(blimitOrders, slimitOrders *[]types.Order) {
	val, err := config.RedisClient.RPop(ctx, types.LimitOrders).Result()
	if err == redis.Nil {
		return
	}
	if err != nil {
		log.Printf("ERROR limitOrderIntoArray: %v", err)
		return
	}

	var order types.Order
	if err := json.Unmarshal([]byte(val), &order); err != nil {
		log.Printf("ERROR parsing limit order: %v", err)
		return
	}

	fmt.Println("> parsedOrder :", order)

	if strings.ToUpper(order.Side) == "BUY" {
		*blimitOrders = append(*blimitOrders, order)
	} else {
		*slimitOrders = append(*slimitOrders, order)
	}

	fmt.Println("> slimitOrders :", *slimitOrders)
	fmt.Println("> blimitOrders :", *blimitOrders)
}

func removeOrderFromArray(blimitOrders, slimitOrders *[]types.Order) {
	val, err := config.RedisClient.RPop(ctx, types.OrderToCancel).Result()
	if err == redis.Nil {
		fmt.Println("📦📦📦 EMPTY removeOrderFromArray() ")
		return
	}
	if err != nil {
		log.Printf("ERROR removeOrderFromArray: %v", err)
		return
	}

	var cancelOrder struct {
		OrderId string `json:"orderId"`
		Side    string `json:"side"`
	}
	if err := json.Unmarshal([]byte(val), &cancelOrder); err != nil {
		log.Printf("ERROR parsing cancel order: %v", err)
		return
	}

	if strings.ToUpper(cancelOrder.Side) == "BUY" {
		var filtered []types.Order
		for _, o := range *blimitOrders {
			if o.OrderId != cancelOrder.OrderId {
				filtered = append(filtered, o)
			}
		}
		*blimitOrders = filtered
	} else {
		var filtered []types.Order
		for _, o := range *slimitOrders {
			if o.OrderId != cancelOrder.OrderId {
				filtered = append(filtered, o)
			}
		}
		*slimitOrders = filtered
	}
}

func executingLimitOrders(blimitOrders, slimitOrders *[]types.Order) {
	livePriceStr, err := config.RedisClient.RPop(ctx, types.LivePriceQueue).Result()
	if err == redis.Nil {
		fmt.Println("no livePrice in queue (engine/index.ts)", livePriceStr)
		return
	}
	if err != nil {
		log.Printf("ERROR executingLimitOrders RPop: %v", err)
		return
	}

	var livePrice types.LivePrice
	if err := json.Unmarshal([]byte(livePriceStr), &livePrice); err != nil {
		log.Printf("ERROR parsing live price: %v", err)
		return
	}

	fmt.Println("> parsedLivePrice", livePrice)

	var validBuyOrders []types.Order
	var remainingBuy []types.Order
	for _, o := range *blimitOrders {
		if o.Symbol == livePrice.Symbol && o.Price > livePrice.Price {
			validBuyOrders = append(validBuyOrders, o)
		} else {
			remainingBuy = append(remainingBuy, o)
		}
	}
	*blimitOrders = remainingBuy

	for _, order := range validBuyOrders {
		payload, _ := json.Marshal(map[string]any{
			"from":      "engine",
			"userId":    order.UserId,
			"orderId":   order.OrderId,
			"openPrice": livePrice.Price,
		})
		if err := config.RedisClient.LPush(ctx, types.UpdateOrder, string(payload)).Err(); err != nil {
			log.Printf("ERROR pushing updateOrder: %v", err)
		}
	}

	var validSellOrders []types.Order
	var remainingSell []types.Order
	for _, o := range *slimitOrders {
		if o.Symbol == livePrice.Symbol && o.Price < livePrice.Price {
			validSellOrders = append(validSellOrders, o)
		} else {
			remainingSell = append(remainingSell, o)
		}
	}
	*slimitOrders = remainingSell

	for _, order := range validSellOrders {
		payload, _ := json.Marshal(map[string]any{
			"from":      "engine",
			"userId":    order.UserId,
			"orderId":   order.OrderId,
			"openPrice": livePrice.Price,
		})
		if err := config.RedisClient.LPush(ctx, types.UpdateOrder, string(payload)).Err(); err != nil {
			log.Printf("ERROR pushing updateOrder: %v", err)
		}
	}
}

func orderCloseExecutor() {
	orderMap := make(map[string]types.OrderToClose)

	for {
		val, err := config.RedisClient.RPop(ctx, types.SltpOrderClose).Result()
		if err == redis.Nil {
			fmt.Println("no new order to stop (orderCloseEngine/index.ts)")
			time.Sleep(100 * time.Millisecond)
			continue
		}
		if err != nil {
			log.Printf("ERROR orderCloseExecutor RPop: %v", err)
			time.Sleep(100 * time.Millisecond)
			continue
		}

		var parsedOrder types.OrderToClose
		if err := json.Unmarshal([]byte(val), &parsedOrder); err != nil {
			log.Printf("ERROR parsing sltp order: %v", err)
			continue
		}

		fmt.Println("📦 parsedOrder : ", parsedOrder)
		orderMap[parsedOrder.OrderId] = parsedOrder

		livePriceStr, err := config.RedisClient.RPop(ctx, types.LivePriceQueue).Result()
		if err == redis.Nil {
			fmt.Println("no new livePrice in queue (orderCloseEngine/index.ts)", livePriceStr)
			continue
		}
		if err != nil {
			log.Printf("ERROR orderCloseExecutor livePrice RPop: %v", err)
			continue
		}

		var livePrice types.LivePrice
		if err := json.Unmarshal([]byte(livePriceStr), &livePrice); err != nil {
			log.Printf("ERROR parsing live price in orderCloseExecutor: %v", err)
			continue
		}

		var filteredOrder []types.OrderToClose

		for _, ordDetails := range orderMap {
			if ordDetails.Symbol != livePrice.Symbol {
				continue
			}

			triggered := false
			switch {
			case ordDetails.Tp < livePrice.Price && ordDetails.Side == "BUY":
				triggered = true
			case ordDetails.Sl < livePrice.Price && ordDetails.Side == "SELL":
				triggered = true
			case ordDetails.Sl > livePrice.Price && ordDetails.Side == "BUY":
				triggered = true
			case ordDetails.Tp > livePrice.Price && ordDetails.Side == "SELL":
				triggered = true
			}

			if triggered {
				filteredOrder = append(filteredOrder, ordDetails)
				delete(orderMap, ordDetails.OrderId)
			}
		}

		for _, order := range filteredOrder {
			cancelPayload, _ := json.Marshal(map[string]any{
				"orderId": order.OrderId,
				"side":    order.Side,
			})
			if err := config.RedisClient.LPush(ctx, types.OrderToCancel, string(cancelPayload)).Err(); err != nil {
				log.Printf("ERROR pushing orderToCancel: %v", err)
			}

			payload, _ := json.Marshal(map[string]any{
				"from":     "orderCloseEngine",
				"orderObj": order,
			})
			if err := config.RedisClient.LPush(ctx, types.UpdateOrder, string(payload)).Err(); err != nil {
				log.Printf("ERROR pushing updateOrder: %v", err)
			}
		}
	}
}
