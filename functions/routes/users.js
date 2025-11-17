//routes/users.js
// само за /users

import { Router } from "express";
//импортираме middleware за валидация на токена
import { getAllUsers, changeRole, getCurrentUser, updateCurrentUser, changePassword, getUserById, forgotPassword, resetPassword } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authJWT.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireRole } from "../middleware/roleCheck.js";

const router = Router();

// GET /users - само за админ
router.get("/", verifyToken, requireAdmin, requireRole("admin"), getAllUsers);

// PATCH /users/:id/role - промяна на роля от админ
router.patch("/:id/role", verifyToken, requireAdmin, requireRole("admin"), changeRole);

//GET /users/me - връща данни за текущия логнат потребител
router.get("/me", verifyToken, getCurrentUser);

// PATCH /users/me - обновява профила на текущия логнат потребител
router.patch("/me", verifyToken, updateCurrentUser);

// POST /users/change-password
router.post("/change-password", verifyToken, changePassword);

// GET /users/:id
router.get("/:id", getUserById);

//POST /users/forgot-password
router.post("/forgot-password", forgotPassword);

//POST /users/reset-password/:token
router.post("/reset-password/:token", resetPassword);

export default router;