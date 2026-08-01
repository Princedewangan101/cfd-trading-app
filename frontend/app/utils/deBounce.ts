export function debounce<A extends unknown[]>(func: (...args: A) => void, delay: number) {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    return (...args: A) => {
        clearTimeout(timerId);

        timerId = setTimeout(() => func(...args), delay)
    }
}
