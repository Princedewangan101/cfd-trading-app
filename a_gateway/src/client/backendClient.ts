import axios from "axios";

export const openTrade = async (data: any, userId: number) => {
    const res = await axios.post(
        "http://backend:5000/internal/trade/open",
        data,
        {
            headers: {
                "x-user-id": userId
            }
        }
    );
    return res.data;
};

export const closeTrade = async (data: any, userId: number) => {
    const res = await axios.post(
        "http://backend:5000/internal/trade/close",
        data,
        {
            headers: {
                "x-user-id": userId
            }
        }
    );
    return res.data;
};