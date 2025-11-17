//db/firestore.js
//връзка към firestore базата със Admin SDK key

//импрортираме Admin SDK
import admin from "firebase-admin";

// fs е вграден модул в Node.js (File System).
// С него можеш да четеш, пишеш, триеш и променяш файлове на компютъра.
import fs from "fs";
import { config } from "../config/config.js";


// достъпваме в .env файла записа с ключ MYAPP_FIREBASE_KEY
const serviceAccountPath = config.firebase.keyPath;

// отвори файла от пътя, 
// прочети съдържанието му като текст (utf8), 
// парсни текста в JavaScript обект чрез JSON.parse
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

//Инициализация на Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Връзка към пазата
const db = admin.firestore();

// Експортиране на db
export default db;