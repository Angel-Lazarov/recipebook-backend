// functions/index.js
import functions from "firebase-functions";
import app from "./server.js"; // твоя server.js
import logger from "firebase-functions/logger";


// (по желание) глобални настройки
functions.logger = logger; // ако искаш да ползваш logger

// Wrap Express app като Firebase Function, set maxInstances (по избор)
export const api = functions.runWith({ maxInstances: 10 }).https.onRequest(app);
