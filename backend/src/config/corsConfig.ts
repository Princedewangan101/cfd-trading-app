function resolveOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN;
    if (raw) {
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("CORS_ORIGIN must be set in production");
    }
    return ["http://localhost:3000"];
}

export const corsOptions = {
    origin: resolveOrigins(),
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
};
