// config/config.js
import dotenv from "dotenv";
dotenv.config(); // зарежда .env

// помощна функция за валидиране на env променливи
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`❌ Missing ${name} in .env`);
    }
    return value;
}

// централизиран конфиг
export const config = {
    server: {
        port: process.env.PORT || 3443,
        frontendUrl: requireEnv("FRONTEND_URL"), // ще хвърли грешка ако липсва
    },
    jwt: {
        secret: requireEnv("JWT_SECRET"),
    },
    firebase: {
        keyPath: requireEnv("FIREBASE_KEY"),
    },
    r2: {
        accessKey: requireEnv("R2_ACCESS_KEY"),
        secretKey: requireEnv("R2_SECRET_KEY"),
        accountId: requireEnv("R2_ACCOUNT_ID"),
        bucketName: requireEnv("R2_BUCKET_NAME"),
    },
};