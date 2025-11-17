// utils/sendEmail.js
import nodemailer from "nodemailer";

export async function sendEmail(to, subject, html) {
    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com", // това е SMTP хостът на Brevo
        port: 587,
        secure: false, // важно за порт 587
        auth: {
            user: process.env.BREVO_USER,   // твоят имейл (от .env)
            pass: process.env.BREVO_SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: `"RecipeBook" <${process.env.BREVO_SENDER}>`, // от кого се изпраща
        to,                                           // до кого
        subject,                                      // тема
        html                                           // HTML съдържание
    });

    console.log(`✅ Email изпратен успешно до: ${to}`);
}
