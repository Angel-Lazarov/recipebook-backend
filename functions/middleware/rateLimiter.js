///middleware/rateLimiter.js

import rateLimit from "express-rate-limit";

// Ограничение за login (10 опита на 15 минути)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минути
    max: 10, // максимум 10 заявки за 15 минути
    message: { error: "Твърде много опити за вход. Моля, опитайте след 15 минути." },
    standardHeaders: true, // връща RateLimit заглавки
    legacyHeaders: false,
});