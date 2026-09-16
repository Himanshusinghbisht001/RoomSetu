import 'dotenv/config';
import { env } from './src/config/env.js';
console.log('SMTP_HOST configured:', !!env.SMTP_HOST);
console.log('SMTP_PORT configured:', !!env.SMTP_PORT, typeof env.SMTP_PORT);
console.log('SMTP_USER configured:', !!env.SMTP_USER);
console.log('SMTP_PASS configured:', !!env.SMTP_PASS);
console.log('FEEDBACK_RECEIVER_EMAIL configured:', !!env.FEEDBACK_RECEIVER_EMAIL);

