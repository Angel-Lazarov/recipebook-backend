//controllers/userController.js

import { isStrongPassword } from "../utils/validatePasswordStrength.js";
import db from "../db/firestore.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import { config } from "../config/config.js";

// GET /users - само за админ
export async function getAllUsers(req, res) {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Достъпът е отказан" });
        }

        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => {
            const { passwordHash, ...userData } = doc.data(); //филтрирам чувствителни данни
            return { id: doc.id, ...userData };
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// PATCH /users/:id/role - промяна на роля от админ
export async function changeRole(req, res) {

    if (req.user.userId === req.params.id) {
        return res.status(400).json({ error: "Не може да сменяш собствената си роля" });
    }

    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Достъпът е отказан" });
        }
        const { role } = req.body;

        //Проверка дали подадената роля е валидна (например само "user" или "admin").
        const validRoles = ["user", "admin"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Невалидна роля" });
        }

        await db.collection('users').doc(req.params.id).update({ role });
        res.json({ msg: "Role updated!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// GET /users/me - връща данни за текущия логнат потребител
export async function getCurrentUser(req, res) {
    try {
        const userId = req.user.userId; // идва от JWT payload-а

        //??? взима конкретен юзър по ID
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "Потребителят не е намерен." });
        }

        const userData = userDoc.data();

        const { passwordHash, ...safeData } = userData;

        res.json({ id: userDoc.id, ...safeData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// PATCH /users/me - обновява името и имайла на текущия логнат потребител
export async function updateCurrentUser(req, res) {
    try {
        const userId = req.user.userId; // взимаме ID-то от токена
        const { username, email } = req.body; // данни, които потребителят може да променя

        if (!username && !email) {
            return res.status(400).json({ error: "Няма подадени данни за обновление" });
        }

        const updatedData = {};
        if (username !== undefined) updatedData.username = username;
        if (email !== undefined) updatedData.email = email;

        await db.collection('users').doc(userId).update(updatedData);
        res.json({ msg: "Профилът е обновен успешно!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /users/change-password
export async function changePassword(req, res) {
    try {
        const userId = req.user.userId;
        const { oldPassword, newPassword } = req.body;

        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({ error: "Потребителят не е намерен" });
        }

        const user = userSnap.data();

        if (!user.passwordHash) {
            return res.status(400).json({ error: "Няма налична парола за проверка" });
        }

        // Проверка на старата парола
        const match = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!match) return res.status(400).json({ error: "Невалидна стара парола" });

        // ✅ Проверка за сила на новата парола
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                error:
                    "Новата парола трябва да е поне 8 символа и да съдържа малка, главна буква, цифра и специален символ!",
            });
        }

        // Хеширане на новата парола
        const hashed = await bcrypt.hash(newPassword, 10);
        await userRef.update({ passwordHash: hashed });

        res.json({ msg: "Паролата е сменена успешно!" });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: err.message });
    }
}

// GET /users/:id
export async function getUserById(req, res) {
    try {
        const userId = req.params.id;
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "Потребителят не е намерен" });
        }

        const { passwordHash, email, role, ...safeData } = userDoc.data(); // махаме чувствителното
        res.json({ id: userDoc.id, ...safeData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// POST /users/forgot-password
export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email е задължителен." });

        // Търсим потребителя по email
        const snapshot = await db.collection("users").where("email", "==", email).get();
        if (snapshot.empty) {
            // Винаги връщаме едно и също съобщение за безопасност
            return res.status(200).json({
                msg: "Ако имейлът съществува, ще получите линк за смяна на парола.",
                remaining: null
            });
        }

        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;

        const userResetRef = db.collection("passwordResets").doc(userId);
        const resetSnap = await userResetRef.get();
        const now = Date.now();
        const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

        let requestsToday = 0;
        let lastRequestedAt = 0;

        if (resetSnap.exists) {
            const data = resetSnap.data();
            requestsToday = data.day === today ? data.requestsToday : 0;
            lastRequestedAt = data.lastRequestedAt || 0;

            // cooldown 60 секунди
            if (now - lastRequestedAt < 60 * 1000) {
                return res.status(429).json({
                    error: "cooldown_active",
                    remaining: 5 - requestsToday
                });
            }

            // дневен лимит 5 заявки
            if (requestsToday >= 5) {
                return res.status(429).json({
                    error: "daily_limit_reached",
                    remaining: 0
                });
            }
        }

        // Генерираме нов токен
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = now + 15 * 60 * 1000; // 15 минути валидност

        // Записваме/обновяваме документа
        await userResetRef.set({
            resetToken,
            expiresAt,
            lastRequestedAt: now,
            requestsToday: requestsToday + 1,
            day: today
        });

        // Създаваме линка
        const resetLink = `${config.server.frontendUrl}/reset-password/${resetToken}`;


        console.log("📧 Ще се опитаме да пращаме имейл на:", email);
        // Пращаме имейл
        await sendEmail(
            email,
            "Възстановяване на парола",
            `<p>Здравей! Кликни <a href="${resetLink}">тук</a>, за да смениш паролата си. Линкът е валиден 15 минути.</p>`
        );

        // Връщаме стандартно съобщение + оставащи заявки
        res.json({
            msg: "Ако имейлът съществува, ще получите линк за смяна на парола.",
            remaining: 5 - (requestsToday + 1)
        });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ error: "Възникна грешка при обработка на заявката." });
    }
}

// POST /users/reset-password/:token
export async function resetPassword(req, res) {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        // Проверяваме паролата
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                error: "Паролата не отговаря на изискванията за сила.",
            });
        }

        // Намираме запис с токена
        const resetSnap = await db.collection("passwordResets")
            .where("resetToken", "==", token)
            .get();

        if (resetSnap.empty) {
            return res.status(400).json({ error: "Невалиден или изтекъл токен." });
        }

        const resetDoc = resetSnap.docs[0];
        const { expiresAt } = resetDoc.data();
        const userId = resetDoc.id;

        // Проверка за изтичане
        if (Date.now() > expiresAt) {
            await db.collection("passwordResets").doc(userId).delete();
            return res.status(400).json({ error: "Токенът е изтекъл." });
        }

        // Хешираме и обновяваме паролата
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.collection("users").doc(userId).update({ passwordHash: hashed });

        // Изтриваме токена (за сигурност)
        await db.collection("passwordResets").doc(userId).delete();

        res.json({ msg: "Паролата е сменена успешно!" });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ error: err.message });
    }
}




