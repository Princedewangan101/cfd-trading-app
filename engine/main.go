package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"engine-go/config"
	"engine-go/types"

	"github.com/redis/go-redis/v9"
	"golang.org/x/tools/go/analysis/passes/defers"
)

var ctx = context.Background()

var wg sync.WaitGroup
var mu sync.Mutex

func main() {
	go limitOrderMatcher()
	orderCloseExecutor()
	select {}
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
	var buyOrders []types.Order
	var sellOrders []types.Order

	for {
		var users *[]string
		var err error
		if users, err = makingBatchOfUserIdWhoseBalanceNearToZero(); err != nil {
			if err.Error() != types.RedisNil {
				continue
				// retry fn.
			}
		}
		batchExecution(&buyOrders, &sellOrders, users)

		OrderInArray(&buyOrders, &sellOrders)

	}
}

func makingBatchOfUserIdWhoseBalanceNearToZero() (*[]string, error) {
	users := []string{}

	for i := 0; i < 500; i++ {

		val, err := config.RedisClient.RPop(ctx, "h").Result()

		// [INFO] Redis queue 'orderCloseBecauseOfLowBalance' is empty.
		// [ERROR MESSAGE] redis: nil
		// [ERROR] redis: nil
		if err == redis.Nil {
			if len(users) > 0 {
				return &users, nil
			} else {
				fmt.Printf("\n[INFO] Redis queue '%s' is empty\n[ERROR] %v", types.OrderCloseBecauseOfLowBalance, err)
				return nil, err
			}
		}
		if err != nil {
			log.Printf("\n> failed to fetch user from Redis queue '%s',\n> error: %v", types.OrderCloseBecauseOfLowBalance, err)
			return nil, err
		}
		if err := json.Unmarshal([]byte(val), &users); err != nil {
			log.Printf("\n> error: parsing orderCloseBecauseOfLowBalance: %v", err)
			return nil, err
		}
	}

	return &users, nil
}

func batchExecution(buyOrders, sellOrders *[]types.Order, users *[]string) {

	var filteredBuy []types.Order
	var filteredSell []types.Order

	userMap := make(map[string]string)

	for _, userId := range *users {
		userMap[userId] = "0"
	}

	for _, buyOrder := range *buyOrders {
		wg.Add(1)
		go func(buyOrder types.Order) {
			defer wg.Done()
			_, exist := userMap[buyOrder.UserId]

			if !exist {
				mu.Lock()
				filteredBuy = append(filteredBuy, buyOrder)
				mu.Unlock()
			}
		}(buyOrder)
	}

	for _, sellOrder := range *sellOrders {
		wg.Add(1)
		go func(sellOrder types.Order) {
			defer wg.Done()
			_, exist := userMap[sellOrder.UserId]

			if !exist {
				mu.Lock()
				filteredBuy = append(filteredBuy, sellOrder)
				mu.Unlock()
			}
		}(sellOrder)
	}

	wg.Wait()

	*buyOrders = filteredBuy
	*sellOrders = filteredSell
}

// func OrderInArray(buyOrders, sellOrders *[]types.Order) {
// 	for i := 0; i < 10000; i++ {
// 		wg.Add(1)
// 		go func(buyOrders, sellOrders *[]types.Order) {
// 			defer wg.Done()
// 			val, err := config.RedisClient.RPop(ctx, types.LimitOrders).Result()
// 			if err == redis.Nil {
// 				return
// 			}
// 			if err != nil {
// 				log.Printf("ERROR limitOrderIntoArray: %v", err)
// 				return
// 			}

// 			var order types.Order
// 			if err := json.Unmarshal([]byte(val), &order); err != nil {
// 				log.Printf("ERROR parsing limit order: %v", err)
// 				return
// 			}

// 			if strings.ToUpper(order.Side) == "BUY" {
// 				*buyOrders = append(*buyOrders, order)
// 			} else {
// 				*sellOrders = append(*sellOrders, order)
// 			}
// 		}(buyOrders, sellOrders)
// 	}
// 	wg.Wait()
// }

// func removeOrderFromArray(blimitOrders, slimitOrders *[]types.Order) {
// 	val, err := config.RedisClient.RPop(ctx, types.OrderToCancel).Result()
// 	if err == redis.Nil {
// 		fmt.Println("📦📦📦 EMPTY removeOrderFromArray() ")
// 		return
// 	}
// 	if err != nil {
// 		log.Printf("ERROR removeOrderFromArray: %v", err)
// 		return
// 	}

// 	var cancelOrder struct {
// 		OrderId string `json:"orderId"`
// 		Side    string `json:"side"`
// 	}
// 	if err := json.Unmarshal([]byte(val), &cancelOrder); err != nil {
// 		log.Printf("ERROR parsing cancel order: %v", err)
// 		return
// 	}

// 	if strings.ToUpper(cancelOrder.Side) == "BUY" {
// 		var filtered []types.Order
// 		for _, o := range *blimitOrders {
// 			if o.OrderId != cancelOrder.OrderId {
// 				filtered = append(filtered, o)
// 			}
// 		}
// 		*blimitOrders = filtered
// 	} else {
// 		var filtered []types.Order
// 		for _, o := range *slimitOrders {
// 			if o.OrderId != cancelOrder.OrderId {
// 				filtered = append(filtered, o)
// 			}
// 		}
// 		*slimitOrders = filtered
// 	}
// }

// func executingLimitOrders(blimitOrders, slimitOrders *[]types.Order) {
// 	livePriceStr, err := config.RedisClient.RPop(ctx, types.LivePriceQueue).Result()
// 	if err == redis.Nil {
// 		fmt.Println("no livePrice in queue (engine/index.ts)", livePriceStr)
// 		return
// 	}
// 	if err != nil {
// 		log.Printf("ERROR executingLimitOrders RPop: %v", err)
// 		return
// 	}

// 	var livePrice types.LivePrice
// 	if err := json.Unmarshal([]byte(livePriceStr), &livePrice); err != nil {
// 		log.Printf("ERROR parsing live price: %v", err)
// 		return
// 	}

// 	fmt.Println("> parsedLivePrice", livePrice)

// 	var validBuyOrders []types.Order
// 	var remainingBuy []types.Order
// 	for _, o := range *blimitOrders {
// 		if o.Symbol == livePrice.Symbol && o.Price > livePrice.Price {
// 			validBuyOrders = append(validBuyOrders, o)
// 		} else {
// 			remainingBuy = append(remainingBuy, o)
// 		}
// 	}
// 	*blimitOrders = remainingBuy

// 	for _, order := range validBuyOrders {
// 		payload, _ := json.Marshal(map[string]any{
// 			"from":      "engine",
// 			"userId":    order.UserId,
// 			"orderId":   order.OrderId,
// 			"openPrice": livePrice.Price,
// 		})
// 		if err := config.RedisClient.LPush(ctx, types.UpdateOrder, string(payload)).Err(); err != nil {
// 			log.Printf("ERROR pushing updateOrder: %v", err)
// 		}
// 	}

// 	var validSellOrders []types.Order
// 	var remainingSell []types.Order
// 	for _, o := range *slimitOrders {
// 		if o.Symbol == livePrice.Symbol && o.Price < livePrice.Price {
// 			validSellOrders = append(validSellOrders, o)
// 		} else {
// 			remainingSell = append(remainingSell, o)
// 		}
// 	}
// 	*slimitOrders = remainingSell

// 	for _, order := range validSellOrders {
// 		payload, _ := json.Marshal(map[string]any{
// 			"from":      "engine",
// 			"userId":    order.UserId,
// 			"orderId":   order.OrderId,
// 			"openPrice": livePrice.Price,
// 		})
// 		if err := config.RedisClient.LPush(ctx, types.UpdateOrder, string(payload)).Err(); err != nil {
// 			log.Printf("ERROR pushing updateOrder: %v", err)
// 		}
// 	}
// }

// func orderCloseExecutor() {
// 	orderMap := make(map[string]types.OrderToClose)

// 	for {
// 		val, err := config.RedisClient.RPop(ctx, types.SltpOrderClose).Result()
// 		if err == redis.Nil {
// 			fmt.Println("no new order to stop (orderCloseEngine/index.ts)")
// 			time.Sleep(100 * time.Millisecond)
// 			continue
// 		}
// 		if err != nil {
// 			log.Printf("ERROR orderCloseExecutor RPop: %v", err)
// 			time.Sleep(100 * time.Millisecond)
// 			continue
// 		}

// 		var parsedOrder types.OrderToClose
// 		if err := json.Unmarshal([]byte(val), &parsedOrder); err != nil {
// 			log.Printf("ERROR parsing sltp order: %v", err)
// 			continue
// 		}

// 		fmt.Println("📦 parsedOrder : ", parsedOrder)
// 		orderMap[parsedOrder.OrderId] = parsedOrder

// 		livePriceStr, err := config.RedisClient.RPop(ctx, types.LivePriceQueue).Result()
// 		if err == redis.Nil {
// 			fmt.Println("no new livePrice in queue (orderCloseEngine/index.ts)", livePriceStr)
// 			continue
// 		}
// 		if err != nil {
// 			log.Printf("ERROR orderCloseExecutor livePrice RPop: %v", err)
// 			continue
// 		}

// 		var livePrice types.LivePrice
// 		if err := json.Unmarshal([]byte(livePriceStr), &livePrice); err != nil {
// 			log.Printf("ERROR parsing live price in orderCloseExecutor: %v", err)
// 			continue
// 		}

// 		var filteredOrder []types.OrderToClose

// 		for _, ordDetails := range orderMap {
// 			if ordDetails.Symbol != livePrice.Symbol {
// 				continue
// 			}

// 			triggered := false
// 			switch {
// 			case ordDetails.Tp < livePrice.Price && ordDetails.Side == "BUY":
// 				triggered = true
// 			case ordDetails.Sl < livePrice.Price && ordDetails.Side == "SELL":
// 				triggered = true
// 			case ordDetails.Sl > livePrice.Price && ordDetails.Side == "BUY":
// 				triggered = true
// 			case ordDetails.Tp > livePrice.Price && ordDetails.Side == "SELL":
// 				triggered = true
// 			}

// 			if triggered {
// 				filteredOrder = append(filteredOrder, ordDetails)
// 				delete(orderMap, ordDetails.OrderId)
// 			}
// 		}

// 		for _, order := range filteredOrder {
// 			cancelPayload, _ := json.Marshal(map[string]any{
// 				"orderId": order.OrderId,
// 				"side":    order.Side,
// 			})
// 			if err := config.RedisClient.LPush(ctx, types.OrderToCancel, string(cancelPayload)).Err(); err != nil {
// 				log.Printf("ERROR pushing orderToCancel: %v", err)
// 			}

// 			payload, _ := json.Marshal(map[string]any{
// 				"from":     "orderCloseEngine",
// 				"orderObj": order,
// 			})
// 			if err := config.RedisClient.LPush(ctx, types.UpdateOrder, string(payload)).Err(); err != nil {
// 				log.Printf("ERROR pushing updateOrder: %v", err)
// 			}
// 		}
// 	}
// }
