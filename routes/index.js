//routes/index.js
// събира всички рутове

import { Router } from "express";
import usersRouter from "./users.js";
import recipesRouter from "./recipes.js";
import authRouter from "./auth.js";

const router = Router();

// Казваме кой рутер на кой път да отговаря
router.use("/users", usersRouter);
router.use("/recipes", recipesRouter);
router.use("/auth", authRouter);

export default router;