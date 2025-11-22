// utils/sendEmail.js
import nodemailer from "nodemailer";
import { config } from "../config/config.js";

console.log("🔹 Brevo user:", config.brevo.user);
console.log("🔹 Brevo sender:", config.brevo.sender);
console.log("🔹 Brevo pass length:", config.brevo.pass?.length);

export async function sendEmail(to, subject, html) {
    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com", // това е SMTP хостът на Brevo
        port: 587,
        secure: false, // важно за порт 587
        auth: {
            user: config.brevo.user,
            pass: config.brevo.pass
        }
    });

    await transporter.sendMail({
        from: `"RecipeBook" <${config.brevo.sender}>`, // от кого се изпраща
        to,                                           // до кого
        subject,                                      // тема
        html                                           // HTML съдържание
    });

    console.log(`✅ Email изпратен успешно до: ${to}`);
}
