// middleware/csrfProtection.js
import csrf from "csurf";

// Използваме cookie за CSRF токена (по-сигурно за SPA)
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,   // токенът не може да се чете от JS
    secure: true,     // изисква HTTPS
    sameSite: "strict", // предотвратява cross-site атаки
  },
});
