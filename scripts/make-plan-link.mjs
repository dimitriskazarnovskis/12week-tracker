// Персональная ссылка для клиента: шифрует файл плана/обновления и кладёт в public/plans/.
// Использование:  node scripts/make-plan-link.mjs "D:/путь/к/плану.json"
// После этого: git add -A && git commit -m "plan" && git push  (деплой ~40 сек) — и ссылка живая.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const src = process.argv[2];
if (!src) { console.error('Укажите путь к JSON-файлу плана или обновления.'); process.exit(1); }
const text = fs.readFileSync(src, 'utf8');
const parsed = JSON.parse(text); // валидация JSON
if (parsed.app !== 'kazarnovskis-dashboard') { console.error('Это не файл дашборда.'); process.exit(1); }

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const id = Array.from(crypto.randomBytes(10)).map(b => alphabet[b % alphabet.length]).join('');
const key = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-128-gcm', key, iv);
// WebCrypto ждёт auth-tag приклеенным к концу шифртекста — так и пишем: iv | ciphertext | tag
const blob = Buffer.concat([iv, cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]);

const dir = path.join(import.meta.dirname, '..', 'public', 'plans');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, id + '.bin'), blob);

const param = id + '_' + key.toString('base64url');
const kind = parsed.type === 'update' ? 'обновление' : 'полный план';
console.log('Тип: ' + kind + ' · файл: public/plans/' + id + '.bin (' + blob.length + ' байт)');
console.log('');
console.log('Ссылка для клиента (Telegram):');
console.log('  https://t.me/kazarnovskis_bot/dashboard?startapp=' + param);
console.log('Запасная (браузер):');
console.log('  https://dimitriskazarnovskis.github.io/12week-tracker/#plan=' + param);
console.log('');
console.log('Не забудьте задеплоить: git add -A && git commit -m "plan: новая ссылка" && git push');
