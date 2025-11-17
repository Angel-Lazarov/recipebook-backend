// utils/validatePasswordStrength.js
// Проверка на силата на паролата (средно ниво)

export function isStrongPassword(password) {
    const strongPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    return strongPasswordRegex.test(password);
}

/*
✅ Изисквания (средно ниво)
Минимум 8 символа
Поне една главна буква (A–Z)
Поне една малка буква (a–z)
Поне една цифра (0–9)
Поне един специален символ: !@#$%^&*()_+-=[]{}
*/