const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const sessions = new Map();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], products: [], orders: [] }, null, 2));
}
const readDb = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDb = db => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const json = (res, code, body) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
const parseCookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(x => { const i=x.indexOf('='); return [x.slice(0,i).trim(), decodeURIComponent(x.slice(i+1))]; }));
const hash = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') });
const verify = (password, user) => crypto.timingSafeEqual(Buffer.from(hash(password, user.salt).hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
const body = req => new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})});
const currentUser = req => { const sid=parseCookies(req).loqata_session; const uid=sessions.get(sid); if(!uid)return null; return readDb().users.find(u=>u.id===uid)||null; };
const id = prefix => prefix + '_' + crypto.randomBytes(8).toString('hex');

async function api(req,res,url){
  if(req.method==='POST' && url==='/api/auth/register'){
    const b=await body(req); if(!b.name||!b.email||!b.password||b.password.length<8)return json(res,400,{error:'الاسم والبريد وكلمة المرور (8 أحرف على الأقل) مطلوبة'});
    const db=readDb(); const email=b.email.trim().toLowerCase(); if(db.users.some(u=>u.email===email))return json(res,409,{error:'البريد مستخدم بالفعل'});
    const h=hash(b.password); const user={id:id('usr'),name:b.name.trim(),email,role:'customer',salt:h.salt,passwordHash:h.hash,createdAt:new Date().toISOString()}; delete user.hash;
    db.users.push(user); writeDb(db); return login(res,user);
  }
  if(req.method==='POST' && url==='/api/auth/login'){
    const b=await body(req); const db=readDb(); const user=db.users.find(u=>u.email===String(b.email||'').trim().toLowerCase());
    if(!user||!verify(String(b.password||''),user))return json(res,401,{error:'بيانات الدخول غير صحيحة'}); return login(res,user);
  }
  if(req.method==='POST' && url==='/api/auth/logout'){
    const sid=parseCookies(req).loqata_session; sessions.delete(sid); res.setHeader('Set-Cookie','loqata_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'); return json(res,200,{ok:true});
  }
  if(req.method==='GET' && url==='/api/auth/me'){
    const u=currentUser(req); return json(res,200,{user:u?publicUser(u):null});
  }
  if(url==='/api/admin/bootstrap' && req.method==='POST'){
    const db=readDb(); if(db.users.some(u=>u.role==='admin'))return json(res,409,{error:'تم إنشاء المدير بالفعل'});
    const b=await body(req); if(!b.email||!b.password||b.password.length<10)return json(res,400,{error:'أدخل بريد المدير وكلمة مرور من 10 أحرف على الأقل'});
    const h=hash(b.password); const u={id:id('usr'),name:b.name||'مدير لقطة',email:b.email.trim().toLowerCase(),role:'admin',salt:h.salt,passwordHash:h.hash,createdAt:new Date().toISOString()}; db.users.push(u);writeDb(db);return login(res,u);
  }
  if(url.startsWith('/api/admin/') && (!currentUser(req)||currentUser(req).role!=='admin')) return json(res,403,{error:'يجب تسجيل دخول المدير'});
  if(req.method==='GET'&&url==='/api/products'){return json(res,200,readDb().products);}
  if(req.method==='POST'&&url==='/api/products'){const b=await body(req);const db=readDb();const p={...b,id:id('prd'),createdAt:new Date().toISOString()};db.products.push(p);writeDb(db);return json(res,201,p);}
  if(req.method==='GET'&&url==='/api/admin/orders'){return json(res,200,readDb().orders);}
  return json(res,404,{error:'المسار غير موجود'});
}
function publicUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,createdAt:u.createdAt};}
function login(res,u){const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,u.id);res.setHeader('Set-Cookie',`loqata_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);return json(res,200,{user:publicUser(u)});}

const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/'))return await api(req,res,url.pathname);let file=url.pathname==='/'?'/index.html':url.pathname;const full=path.normalize(path.join(ROOT,file));if(!full.startsWith(ROOT)||!fs.existsSync(full)||fs.statSync(full).isDirectory())return json(res,404,{error:'Not found'});const ext=path.extname(full);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(full).pipe(res);}catch(e){console.error(e);json(res,500,{error:'Server error'});}});
server.listen(PORT,()=>console.log(`لقطة يعمل على http://localhost:${PORT}`));
