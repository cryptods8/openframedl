import crypto from "crypto";

const algo = "aes-256-cbc";
const password = process.env.SHUFFLE_SECRET!;

export function hash(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function encrypt(text: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const pwd = password; // hash(password);
  const key = crypto.scryptSync(pwd, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algo, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${salt}_${iv.toString("hex")}${encrypted}`;
}

export function decrypt(value: string) {
  const parts = value.split("_");
  const salt = parts[0]!;
  const text = parts[1]!;
  const pwd = password; // hash(password);
  const key = crypto.scryptSync(pwd, salt, 32);
  const iv = Buffer.from(text.slice(0, 32), "hex");
  const encryptedText = text.slice(32);
  const decipher = crypto.createDecipheriv(algo, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
