import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => !!line && !line.trim().startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return null;
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
    .filter(Boolean),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const rowsResult = await supabase
  .from('generated_contracts')
  .select('id,model_id,project_id,freelancer_id,docx_path,pdf_path,created_at')
  .order('created_at', { ascending: false })
  .limit(20);

console.log('query-error', rowsResult.error ? JSON.stringify(rowsResult.error) : null);
console.log('rows-count', rowsResult.data?.length ?? 0);

if (!rowsResult.data) process.exit(0);

for (const row of rowsResult.data) {
  console.log('ROW', JSON.stringify(row));
  if (row.pdf_path) {
    const downloadResult = await supabase.storage.from('contract-generated').download(row.pdf_path);
    console.log(
      'CHECK',
      row.id,
      row.pdf_path,
      'download-error',
      downloadResult.error ? JSON.stringify(downloadResult.error) : null,
      'has-data',
      downloadResult.data ? true : false,
    );
  }
}
