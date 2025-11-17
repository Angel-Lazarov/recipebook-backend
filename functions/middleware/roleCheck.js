// middleware/roleCheck.js
import db from "../db/firestore.js";

export function requireRole(requiredRole) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: "Не сте логнат" });

            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) return res.status(404).json({ error: "Потребителят не е намерен" });

            const userData = userDoc.data();

            // Вземаме реалната роля от базата
            if (userData.role !== requiredRole) {
                return res.status(403).json({ error: "Нямате достъп до този ресурс" });
            }

            next();
        } catch (err) {
            console.error("Role check error:", err);
            res.status(500).json({ error: "Вътрешна грешка на сървъра" });
        }
    };
}
