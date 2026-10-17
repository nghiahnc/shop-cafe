'use client';

export async function uploadProductImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 5_000_000) throw new Error('Chỉ nhận JPG/PNG/WebP, tối đa 5 MB');
  const prepare = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prepare', type: file.type, size: file.size }) });
  const plan = await prepare.json();
  if (!prepare.ok) throw new Error(plan.error || 'Không thể chuẩn bị tải ảnh');
  let response: Response;
  if (plan.mode === 'direct') {
    const form = new FormData();
    for (const [key, value] of Object.entries(plan.fields as Record<string, string>)) form.set(key, value);
    form.set('file', file);
    const uploaded = await fetch(plan.url, { method: 'POST', body: form });
    if (!uploaded.ok) throw new Error('Không thể tải ảnh lên kho. Vui lòng thử lại.');
    response = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finish', token: plan.token }) });
  } else {
    const form = new FormData(); form.set('file', file);
    response = await fetch('/api/admin/upload', { method: 'POST', body: form });
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể lưu ảnh');
  return result.imagePath;
}
