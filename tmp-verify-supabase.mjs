import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envText = await fs.promises.readFile(path.join(process.cwd(), '.env'), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => !!line && !line.trim().startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1);
      return [key, value];
    }),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: rows, error } = await supabase
  .from('generated_contracts')
  .select('id,model_id,project_id,freelancer_id,docx_path,pdf_path,created_at')
  .order('created_at', { ascending: false })
  .limit(20);
console.log('query-error', error ? JSON.stringify(error) : null);
console.log('rows-count', rows?.length ?? 0);
if (!rows) process.exit(0);
for (let idx = 0; idx < rows.length; idx++) {
  const row = rows[idx];
  console.log(`ROW ${idx + 1}: ${JSON.stringify(row)}`);
  if (row.pdf_path) {
    const { data, error: dlErr } = await supabase.storage.from('contract-generated').download(row.pdf_path);
    console.log(
      'CHECK',
      row.id,
      row.pdf_path,
      'download-error',
      dlErr ? JSON.stringify(dlErr) : null,
      'data',
      data ? 'ok' : 'null',
    );
  }
}
