// server.js
// кратък начин
// import 'dotenv/config';

// dotenv е външна библиотека (инсталира се с npm i dotenv).
// import dotenv from "dotenv";
// Този ред казва на Node.js: "Прочети файла .env и зареди всички
// ключ=стойност двойки като environment variables."
// dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import https from "https";
import fs from "fs";
import path from "path";
import routes from './routes/index.js'; //импортиране на router в app.js
import { config } from "./config/config.js"; // <-- тук ползваме config.js
import { validateAndSanitize } from "./middleware/validateAndSanitize.js";
import helmet from "helmet";
import { csrfProtection } from "./middleware/csrfProtection.js";

// create express application
const app = express();

// Преди app.use(cors()) и преди routes
app.use(helmet());

//-----
// CORS: разрешаваме credentials и само твоя фронтенд
app.use(cors({
    origin: config.server.frontendUrl, // React dev server
    credentials: true, // важно за cookie
}));
//-----

//-------тест----
console.log("🌐 FRONTEND_URL (config):", config.server.frontendUrl);

app.use((req, res, next) => {
    console.log("🔍 Incoming request from:", req.headers.origin);
    next();
});

//-----------

// add Middleware за работа с JSON
// за да може да чете JSON от POST заявките
// За да имаш req.body, трябва да имаш middleware
app.use(express.json());

app.use("/recipes", (req, res, next) => {
    if (req.is("multipart/form-data")) {
        // Multer ще се грижи за body и файловете
        return next();
    }
    // За всички останали заявки – парсване на JSON
    express.json()(req, res, next);
});
app.use(cookieParser());

// CSRF защита за всички state-changing методи
app.use(csrfProtection);


// Endpoint, който ще връща CSRF токена към фронтенда
app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// 🌟 Универсален sanitizer middleware
// Приложи само за POST, PUT и PATCH заявки
app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    if (["POST", "PUT", "PATCH"].includes(method)) {
        return validateAndSanitize(req, res, next);
    }
    next();
});


// Mount routes
app.use("/api", routes);
/* вече имаме пътища до: https://localhost:3443/api/users

GET /api/users
GET /api/users/:id
GET /api/recipes
GET /api/recipes/:id
POST /api/auth/login
POST /api/auth/register
*/

// Път до файловете на сертификата
const sslOptions = {
    key: fs.readFileSync(path.join('certs', 'server.key')),
    cert: fs.readFileSync(path.join('certs', 'server.cert')),
};

// Стартиране на HTTPS сървър
https.createServer(sslOptions, app).listen(config.server.port, () => {
    console.log(`HTTPS server is running on https://localhost:${config.server.port}`);
});
