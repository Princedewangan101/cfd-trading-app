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

var (
	MILLION = 1000000
	TEN_MILLION = 10000000
)

func main() {
	go EngineRun()
	go executingLimitOrders(buyOrders, sellOrders)
	orderCloseExecutor()    
	select {}
}

func EngineRun() {
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

func batchExecution(buyOrders, sellOrders *[]types.Order, users *[]string)  {

	if users == []string {
		return fmt.Printf("no users passed in batchExecution")
	}

	var filteredBuy []types.Order
	var filteredSell []types.Order

	userMap := make(map[string]int)

	i := 1
	for _, userId := range *users {
		userMap[userId] = i
		i++
	}

	for _, buyOrder := range *buyOrders {
		_, exist := userMap[buyOrder.UserId]

		if !exist {
			filteredBuy = append(filteredBuy, buyOrder)
		}
	}

	for _, sellOrder := range *sellOrders {
		_, exist := userMap[sellOrder.UserId]

		if !exist {
			filteredBuy = append(filteredBuy, sellOrder)
		}
	}
	mu.Unlock()
	*buyOrders = filteredBuy
	*sellOrders = filteredSell
	mu.Lock()
}

func OrderInArray(buyOrders, sellOrders *[]types.Order) {
	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func(buyOrders, sellOrders *[]types.Order) {
			defer wg.Done()
			val, err := config.RedisClient.RPop(ctx, types.LimitOrders).Result()
			if err == redis.Nil {
				fmt.Printf("\n[INFO] Redis queue '%s' is empty\n[ERROR] %v", types.OrderCloseBecauseOfLowBalance, err)
				return
			}
			if err != nil {
				log.Printf("\n[ERROR] limitOrderIntoArray: %v", err)
				return
			}

			var order types.Order
			if err := json.Unmarshal([]byte(val), &order); err != nil {
				log.Printf("\n[ERROR] parsing limit order: %v", err)
				return
			}

			if strings.ToUpper(order.Side) == "BUY" {
				mu.Lock()
				*buyOrders = append(*buyOrders, order)
				mu.Unlock()
			} else {
				mu.Lock()
				*sellOrders = append(*sellOrders, order)
				mu.Unlock()
			}
		}(buyOrders, sellOrders)
	}
	wg.Wait()
}

func removeOrderFromArray(buyOrders, sellOrders *[]types.Order) {

	cancelOrders := make(map[string]types.CancelOrders)

	for i := 0; i < TEN_MILLION; i++ {
		order, err := config.RedisClient.RPop(ctx, types.OrderToCancel).Result() // {id:"", symbol:"", side:"", orderId:""}
		if err == redis.Nil {
			fmt.Println("📦📦📦 EMPTY removeOrderFromArray() ")
			return
		}
		if err != nil {
			log.Printf("ERROR removeOrderFromArray: %v", err)
			return
		} 

		var cancelOrder types.CancelOrders
		if err := json.Unmarshal([]byte(order), &cancelOrder); err != nil {
			log.Printf("ERROR parsing cancel order: %v", err)
			return
		}

		cancelOrders[cancelOrder.Id] = types.CancelOrders(cancelOrder)
	}
	
	for _, o := range *buyOrders {
		var filtered []types.CancelOrders
		if strings.ToUpper(cancelOrder.Side) == "BUY" {
		_, exist := cancelOrders[o.OrderId]
			if !exist {
				filtered = append(filtered, o)
			}
		}
		mu.Lock()
		*buyOrders = filtered 
		mu.Unlock()
	} else {
		var filtered []types.CancelOrders
		for _, o := range *sellOrders {
			if strings.ToUpper(cancelOrder.Side) == "SELL" {
				_, exist := cancelOrders[o.OrderId]
	
				if !exist {
					filtered = append(filtered, o)
				}
			}
		}
		mu.Lock()
		*sellOrders = filtered
		mu.Unlock()
	}
}

// func executingLimitOrders(buyOrders, sellOrders *[]types.Order) {
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

// 	var filteredOrders []types.Order
// 	var remainingBuy []types.Order
// 	for _, o := range buyOrders {
// 		if o.Symbol != livePrice.Symbol && o.Price !> livePrice.Price {
// 			filteredOrders = append(filteredOrders, o)
// 		}
// 	}
// 	*buyOrders = filteredOrders

// 	filteredOrders = []
// 	var remainingSell []types.Order
// 	for _, o := range *slimitOrders {
// 		if o.Symbol != livePrice.Symbol && o.Price !< livePrice.Price {
// 			filteredOrders = append(filteredOrders, o)
// 		} 
// 	}
// 	*sellOrders = filteredOrders
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
