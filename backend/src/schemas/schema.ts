import { z } from "zod";

export const userSchema = z.object({
  address: z.string(),
  nonce: z.any(),
  tasks: z.array(z.any()),
});

export const orderSchema = z.object({
  userId: z.number(),
  pair: z.string(),
  lot: z.number(),
  margin: z.number(),
  amount: z.number(),
  isBuy: z.string(),
})
