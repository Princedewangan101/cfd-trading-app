import { Router, Request } from "express";
import { closeTrade, openTrade } from "../client/backendClient";
import { AuthRequest } from "../../types";
import { TRADING_RL } from "../middlewares/routesLimiter";

const router = Router();

router.post("/open", TRADING_RL, (req: Request, res) => {
  if (!req.userId) {
    console.log(`ERROR : MISSING REQ.USER-ID !!! `, `req.userId : ${req.userId}`);
    return res.status(404).json({ message: 'MISSING REQ.USER-ID !!!' });
  }
  const result = openTrade(req.body, req.userId);
  res.json(result);
});

router.post("/close", (req: Request, res) => {
  if (!req.userId) {
    console.log(`ERROR : MISSING REQ.USER-ID !!! `, `req.userId : ${req.userId}`);
    return res.status(404).json({ message: 'MISSING REQ.USER-ID !!!' });
  }
  const result = closeTrade(req.body, req.userId);
  res.json(result);
});

export default router;