//middleware/validateAuth.js
// middleware за проверка на Login/register данни

import { isStrongPassword } from "../utils/validatePasswordStrength.js";

export function validateAuth(req, res, next) {
    const { username, email, password, passwordConfirm } = req.body;

    // Валидация при Register
    if (req.path.endsWith("/register")) {

        // За регистрация – проверяваме username, email и password
        if (!username?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({ error: "Всички полета са задължителни" });
        }

        /* 
        // Проверка за дължината на паролата при Register
        if (password.length < 6) {
            return res.status(400).json({ error: "Паролата трябва да е поне 6 символа!" });
        } 
        */

        // Проверка за сила на паролата
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                error:
                    "Паролата трябва да е поне 8 символа и да съдържа малка, главна буква, цифра и специален символ!",
            });
        }

        // Проверка на повторна парола
        if (!passwordConfirm || password !== passwordConfirm) {
            return res.status(400).json({ error: "Паролите не съвпадат!" });
        }
    } else if (req.path.endsWith("/login")) {
        // За login – проверяваме email и password
        if (!email || !password) {
            return res.status(400).json({ error: "Email и password са задължителни" });
        }
    }

    //ако всичко е наред -> продължи към самия route
    next();
}