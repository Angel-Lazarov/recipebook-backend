// middleware/errorHandler.js

export function multerErrorHandler(err, req, res, next) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Файлът е твърде голям (макс 5 MB)" });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Прекалено много файлове за качване" });
  }
  next(err);
}
