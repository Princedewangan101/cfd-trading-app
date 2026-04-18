import { type Request, type Response, type NextFunction } from "express";
import { ZodType } from "zod";

export const validate =
  (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.safeParseAsync(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: result.error.flatten(),
        });
      }
      req.body = result.data; 
      next();
    } catch (error) {
      console.log("ZOD_VALIDATION_ERROR :", error);
      next(error);
    }
  };
