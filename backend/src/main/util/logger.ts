import pino from "pino";

// Structured JSON logger. Note: this intentionally deviates from the human
// AGENTS.md console.log format (\n > [LEVEL] (file):) because pino emits JSON
// records that the default transport pretty-prints in the terminal.
export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "res.headers['set-cookie']",
        ],
        censor: "[REDACTED]",
    },
    base: { app: "backend" },
});
