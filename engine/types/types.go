package types

const (
	UpdateOrder                  = "updateOrder"
	NotifyUser                   = "notifyUser"
	RealTimeUpdate               = "realTimeUpdateToUser"
	LimitOrders                  = "limitOrders"
	OrderToCancel                = "orderToCancel"
	LivePriceQueue               = "liveprice"
	SltpOrderClose               = "sltpOrderClose"
	OrderCloseBecauseOfLowBalance = "orderCloseBecauseOfLowBalance"

	RedisNil = "redis: nil"
)

type Order struct {
	OrderId string  `json:"orderId"`
	UserId  string  `json:"userId"`
	Symbol  string  `json:"symbol"`
	Side    string  `json:"side"`
	Price   float64 `json:"price"`
}

type OrderToClose struct {
	Tp      float64 `json:"tp"`
	Sl      float64 `json:"sl"`
	Symbol  string  `json:"symbol"`
	Side    string  `json:"side"`
	Price   float64 `json:"price"`
	OrderId string  `json:"orderId"`
	UserId  string  `json:"userId"`
}

type LivePrice struct {
	Symbol string  `json:"symbol"`
	Price  float64 `json:"price"`
}
 