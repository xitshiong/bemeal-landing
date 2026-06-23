const fs = require('fs');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (url && key) {
  const config = { url: url.replace(/\/$/, ''), publishableKey: key };
  fs.writeFileSync(
    'supabase-config.js',
    `window.BEMEAL_SUPABASE = ${JSON.stringify(config, null, 2)};\n`
  );
  console.log('Wrote supabase-config.js from environment variables.');
} else {
  fs.writeFileSync('supabase-config.js', 'window.BEMEAL_SUPABASE = null;\n');
  console.warn('SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY missing — waitlist will use demo mode.');
}
