// middleware/validateAndSanitize.js
import xss from "xss";

// Максимални дължини за полета
const FIELD_LIMITS = {
    username: 50,
    email: 100,
    title: 150,
    category: 50,
    instructions: 5000, // макс брой символи
    ingredients: 2000,  // като string
};

// Полета, които очакваме като масив от string
const ARRAY_FIELDS = ["ingredients"];

// Разрешени файлови типове
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateAndSanitize(req, res, next) {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return next(); // няма данни за проверка
        }

        for (const key in req.body) {
            const value = req.body[key];

            // Ако е масив
            if (Array.isArray(value)) {
                if (!ARRAY_FIELDS.includes(key)) {
                    return res.status(400).json({ error: `${key} не трябва да е масив` });
                }
                for (let i = 0; i < value.length; i++) {
                    if (typeof value[i] !== "string") {
                        return res.status(400).json({ error: `Невалиден елемент в ${key}` });
                    }
                    value[i] = xss(value[i]).trim();
                    if (FIELD_LIMITS[key] && value[i].length > FIELD_LIMITS[key]) {
                        return res.status(400).json({ error: `${key}[${i}] е твърде дълъг (макс ${FIELD_LIMITS[key]} символа)` });
                    }
                }
            }
            // Ако е string
            else if (typeof value === "string") {
                req.body[key] = xss(value).trim();

                // Ограничаваме дължината
                const limit = FIELD_LIMITS[key];
                if (limit && req.body[key].length > limit) {
                    return res.status(400).json({ error: `${key} е твърде дълго (макс ${limit} символа)` });
                }

                // Ограничение на редове за инструкции
                if (key === "instructions") {
                    const maxLines = 200;
                    const lines = req.body[key].split("\n");
                    if (lines.length > maxLines) {
                        return res.status(400).json({ error: `Полето ${key} има твърде много редове (макс ${maxLines})` });
                    }
                }
            }
            else {
                return res.status(400).json({ error: `Невалиден тип за поле ${key}` });
            }
        }

        // Файлове
        if (req.files && req.files.length > 0) {
            if (req.files.length > MAX_FILES) {
                return res.status(400).json({ error: `Може да качите максимум ${MAX_FILES} файла` });
            }

            for (const file of req.files) {
                if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
                    return res.status(400).json({ error: `Невалиден тип файл: ${file.originalname}` });
                }
                if (file.size > MAX_FILE_SIZE) {
                    return res.status(400).json({ error: `Файлът ${file.originalname} е твърде голям` });
                }
            }
        }

        next();
    } catch (err) {
        console.error("Validation/Sanitization error:", err);
        res.status(500).json({ error: "Вътрешна грешка на сървъра" });
    }
}
