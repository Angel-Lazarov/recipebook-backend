import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import { config } from "../config/config.js";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKey,
    secretAccessKey: config.r2.secretKey,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

// 🔹 Качва файл и връща публичния URL
export async function uploadFile(file) {
  const fileName = `${uuid()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await r2.send(command);

  return `https://${PUBLIC_URL}/${fileName}`;
}

// 🔹 Изтрива файл по пълен URL
export async function deleteFile(fileUrl) {
  if (!fileUrl || fileUrl.includes("placehold.co")) return;

  try {
    const url = new URL(fileUrl);
    const Key = url.pathname.replace(/^\/+/, "");

    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key,
    });

    await r2.send(command);

    console.log(`🗑️ Изтрит файл от R2: ${Key}`);
  } catch (err) {
    console.error("❌ Грешка при изтриване от R2:", err.message);
  }
}
