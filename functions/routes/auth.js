//routes/auth.js
// само за /auth

import { Router } from "express";
import { registerUser, loginUser, logoutUser, getCurrentUser } from "../controllers/authController.js";
import { validateAuth } from "../middleware/validateAuth.js";
import { verifyToken } from "../middleware/authJWT.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// POST /auth/login
router.post("/login", loginLimiter, validateAuth, loginUser);

// POST /auth/register
router.post("/register", validateAuth, registerUser);

// routes/auth.js (добави под /login и /register)
router.post("/logout", verifyToken, logoutUser); // ✅ само ако има активен токен

router.get("/me", verifyToken, getCurrentUser);

export default router;