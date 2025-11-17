//middleware/authJWT.js
// middleware за валидиране на JWT

// За токена
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

export function verifyToken(req, res, next) {

    // token взимаме от cookie (низът req.cookies се подава от cookie-parser)
    const token = req.cookies?.token; // 🔹 взимаме токена от cookie-то

    if (!token) {
        return res.status(401).json({ error: "Липсва токен (изисква се login)" });
    }

    try {
        // 2. Проверяваме токена
        const decoded = jwt.verify(token, config.jwt.secret);

        // 3. Закачаме информацията за потребителя към req, за да я ползват другите route-ове
        req.user = decoded;
        next();
    } catch (err) {
        // 403 Forbidden 
        return res.status(403).json({ error: "Невалиден или изтекъл токен." });
    }
}