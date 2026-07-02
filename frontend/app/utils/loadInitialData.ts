import { timeFrame } from "@/lib/timeFrames";
import axios from "axios";
import { handleError } from "./errorHandler";
import { toast } from "react-toastify";
import { toastConfig } from "@/lib/toastConfig";
import { config } from "@/lib/config";

export const loadInitialData = async (symbol: string, timeFrame: string) => {
    try {
        const serverResponse = await axios.get(`http://localhost:5000/api/candles/${symbol}/${timeFrame}`, config)
        // console.log(`> /api/candles/${symbol}/1m`)
        // console.log("> serverResponse : ", serverResponse);
        
        return serverResponse.data.candles
    } catch (error) {
        return error
    }

};