// middleware/upload.js
import multer from "multer";

const storage = multer.memoryStorage(); // файловете се държат в паметта

// 🔹 Максимален размер на един файл: 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024; 

// 🔹 Максимален брой файлове за еднократен upload (multer)
const MAX_UPLOAD_FILES = 20; 

// 🔹 Максимум снимки на рецепта (бизнес правило)
export const MAX_IMAGES_PER_RECIPE = 5;

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

// За PUT /recipes/:id и POST /recipes
// Фронтенд праща всички файлове с името "newFiles"
// Ограничаваме до MAX_UPLOAD_FILES едновременно
export const uploadRecipeImages = upload.array("newFiles", MAX_UPLOAD_FILES);
