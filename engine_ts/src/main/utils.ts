export function printTime() {
    const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };

    const indiaTime = new Date().toLocaleTimeString('en-IN', options);
    console.log(`[IST] Current Time: ${indiaTime}`);
}