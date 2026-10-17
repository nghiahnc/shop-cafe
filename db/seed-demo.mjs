import { databaseUrl } from './env.mjs';
import pg from 'pg';
import bcrypt from 'bcryptjs';
const db = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 20000 });
await db.connect();
try {
  for (const [email,name,password,role] of [
    ['demo@nhacaphe.local','Khách demo','Demo1234!','customer'],
    ['admin@nhacaphe.local','Quản trị Nhà Cà Phê','Admin1234!','admin'],
  ]) {
    const hash = await bcrypt.hash(password,12);
    await db.query(`INSERT INTO users(email,name,password_hash,role) VALUES($1,$2,$3,$4)
      ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role`,[email,name,hash,role]);
  }
  const now = new Date();
  const from = new Date(now.getTime()-86400000);
  const to = new Date(now.getTime()+90*86400000);
  for (const promo of [
    ['Cà phê 10%','code','CAFE10','percent',10,100000,100],
    ['Giảm 20.000 ₫','code','GIAM20K','fixed',20000,150000,50],
  ]) {
    const [name,mode,code,type,value,min,uses] = promo;
    await db.query(`INSERT INTO promotions(name,mode,code,discount_type,discount_value,min_subtotal_vnd,max_uses,starts_at,ends_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT(code) DO NOTHING`,[name,mode,code,type,value,min,uses,from,to]);
  }
  const automatic = await db.query(`SELECT 1 FROM promotions WHERE mode='automatic' LIMIT 1`);
  if (!automatic.rowCount) await db.query(`INSERT INTO promotions(name,mode,discount_type,discount_value,min_subtotal_vnd,max_uses,starts_at,ends_at)
    VALUES('Ưu đãi mỗi ngày','automatic','percent',5,80000,1000,$1,$2)`,[from,to]);
  console.log('Tài khoản và khuyến mãi demo đã sẵn sàng.');
} finally { await db.end(); }
