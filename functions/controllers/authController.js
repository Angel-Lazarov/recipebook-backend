//controllers/authController.js

// Връзката към Firestore
import db from "../db/firestore.js";
// За хеширане на пароли
import bcrypt from "bcryptjs";
// За токена
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import { Timestamp } from "firebase-admin/firestore";

// Register user controller

export async function registerUser(req, res) {
    try {
        const { username, password, email } = req.body;

        //1.1 Проверка дали вече съществува потребител с този email

        // Взимаме референция към колекция "users" в базата.
        const usersRef = db.collection("users");

        const emailSnapshot = await usersRef.where("email", "==", email).get();
        if (!emailSnapshot.empty) {
            return res.status(400).json({ error: "Потребител с такъв email вече съществува!" });
        }

        // 1.2 Проверка дали съществува потребител с такъв username
        const usernameSnapshot = await usersRef.where("username", "==", username).get();
        if (!usernameSnapshot.empty) {
            return res.status(400).json({ error: "Потребител с такова име съществува!" })
        }

        //2. Хеширане на паролата с vcryptjs
        const passwordHash = await bcrypt.hash(password, 10);
        // "10" е броя на salt rounds -> колко пъти да се обработи паролата

        //3/ Създаване на нов потребител
        const newUser = {
            username,
            email,
            passwordHash,
            role: "user",
            createdAt: Timestamp.now(),
        }

        const docRef = await usersRef.add(newUser);

        // Създаваме JWT токен за автоматичен login
        const token = jwt.sign(
            { userId: docRef.id, role: newUser.role }, // payload
            config.jwt.secret,
            { expiresIn: "48h" } // 48 часа
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,        // изисква HTTPS
            sameSite: "None",    // важно за cross-origin (frontend <-> backend)
            maxAge: 48 * 60 * 60 * 1000, // 48 часа
        });


        //Логване за Debug в конзолата
        console.log("New user created with ID:", docRef.id);


        //4. Връщане на отговор към клиента
        res.status(201).json({
            message: "Регистрацията е успешна!",
            userData: {
                id: docRef.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (err) {
        console.error("Грешка при регистрация:", err);
        res.status(500).json({ error: "Вътрешна грешка на сървъра" });
    }
};

export async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        // 1. Проверка дали имаме email и password (валидирано вече с middleware)
        if (!email || !password) {
            return res.status(400).json({ error: "Email и Password са задължителни!" });
        }

        // 2 Вземаме потребителя от Firestore
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where("email", "==", email).get();

        if (snapshot.empty) {
            return res.status(400).json({ error: "Грешен email или парола" });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // 3. Проверка на паролата
        const passwordValid = await bcrypt.compare(password, userData.passwordHash);
        if (!passwordValid) {
            return res.status(400).json({ error: "Грешен email или парола" });
        }

        // 4. Създаване на JWT
        const token = jwt.sign(
            { userId: userDoc.id, role: userData.role }, // payload
            config.jwt.secret,
            { expiresIn: "48h" }
        );

        // 🔹 Запиши токена като HttpOnly cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,        // изисква HTTPS
            sameSite: "None",    // за cross-origin
            maxAge: 48 * 60 * 60 * 1000, // 48 часа в милисекунди
        });

        res.status(200).json({ message: "Успешен вход", userData: { id: userDoc.id, email: userData.email } });
    } catch (err) {
        console.log("Login error:", err);
        res.status(500).json({ error: "Вътрешна грешка на сървъра" });
    }
}

// ✅ LOGOUT — изтрива HttpOnly cookie
// POST /auth/logout
export async function logoutUser(req, res) {
    try {
        // Изчистваме HttpOnly cookie
        res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "strict" });
        res.status(200).json({ message: "Успешен logout" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ error: "Вътрешна грешка на сървъра" });
    }
}

// GET /auth/me
export async function getCurrentUser(req, res) {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: "Не сте логнат" });

        const decoded = jwt.verify(token, config.jwt.secret);
        res.status(200).json({ user: { userId: decoded.userId, role: decoded.role } });
    } catch (err) {
        res.status(403).json({ error: "Невалиден токен" });
    }
}
