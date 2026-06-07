import axios from "axios";

export function handleError(error: any) {
    let errorMessage = "An unexpected error occurred.";

    if (axios.isAxiosError(error)) {
        const response = error.response
        const request = error.request

        if (response) {
            console.log("error.response.data", error.response?.data);
            console.log("error.response.status", error.response?.status);
            errorMessage = error.response?.data.message;
        } else {
            // Request was made but no response was received (Network Down / Timeout)
            console.log("No response received from server:", request);
            errorMessage = error.message;
        }
    } else {
        // Referance or typescript error.
        console.error("Native JavaScript Execution Error:", error);
        errorMessage = error.message;
    }

    console.log("Final Display Message:", errorMessage);
    return errorMessage
}