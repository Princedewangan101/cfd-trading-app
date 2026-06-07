import { config } from "@/lib/config";
import { toastConfig } from "@/lib/toastConfig";
import { useAppStore } from "@/store/store";
import axios from "axios";
import { toast } from "react-toastify";

interface ServerResponseSuccess {
    data: {
        success: boolean,
        data: {
            userId: string,
            userName: string
        }
    }
}
interface ServerResponseFailure {
    data: {
        success: boolean,
        message: string
    }
}

type ServerResponse = ServerResponseSuccess & ServerResponseFailure

export async function authethicate(formData: FormData, authPage: string) {
    try {
        const payload = Object.fromEntries(formData.entries());

        const serverResponse: ServerResponse = await axios.post(`http://localhost:5000/api/${authPage}`, payload, config)

        if (!serverResponse.data) {
            return { success: false, message: "No response from server" }
        }

        console.log("serverResponse :", serverResponse);

        if (!serverResponse.data.success) {
            return { success: false, message: serverResponse.data.message }
        }

        useAppStore.getState().setUserId(serverResponse.data.data.userId)
        useAppStore.getState().setUserName(serverResponse.data.data.userName)

        const userId = useAppStore.getState().userId
        const userName = useAppStore.getState().userName

        console.log(`${userName} :  ${userId}`);


        return { success: serverResponse.data.success, userId: serverResponse.data.data.userId, userName: serverResponse.data.data.userName }

    } catch (error: any) {
        return { success: false, message: `${error.message}` }
    }
}