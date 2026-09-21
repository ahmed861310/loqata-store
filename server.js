const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ORDER_STATUSES = new Set(['جديد','قيد التجهيز','تم الشحن','مكتمل','ملغي']);

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
const currentUser = req => { const sid=parseCookies(req).loqata_session; const session=sessions.get(sid); if(!session)return null; if(Date.now()-session.createdAt>SESSION_TTL_MS){sessions.delete(sid);return null;} return readDb().users.find(u=>u.id===session.userId)||null; };
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
  if(req.method==='GET' && url==='/api/profile'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});return json(res,200,{user:publicUser(u)});}
  if(req.method==='GET'&&url==='/api/products'){return json(res,200,readDb().products);}
  if(req.method==='POST'&&url==='/api/orders'){
    const u=currentUser(req); const b=await body(req);
    if(!b.name||!b.phone||!b.address||!Array.isArray(b.items)||!b.items.length)return json(res,400,{error:'بيانات الطلب غير مكتملة'});
    const db=readDb(); const byId=new Map(db.products.map(p=>[String(p.id),p])); let total=0; const items=[];
    for(const item of b.items){const p=byId.get(String(item.id));const qty=Number(item.qty);if(!p||!Number.isInteger(qty)||qty<1||Number(p.stock||0)<qty)return json(res,400,{error:'أحد المنتجات غير متاح بالكمية المطلوبة'});items.push({id:p.id,name:p.name,qty,price:Number(p.price||0)});total+=qty*Number(p.price||0);}
    for(const item of items){const p=byId.get(String(item.id));p.stock=Number(p.stock||0)-item.qty;}
    const order={id:id('ord'),userId:u?.id||null,date:new Date().toISOString(),name:String(b.name).trim(),phone:String(b.phone).trim(),address:String(b.address).trim(),items,total,status:'جديد'};db.orders.unshift(order);writeDb(db);return json(res,201,order);
  }
  if(req.method==='GET'&&url==='/api/orders/mine'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});return json(res,200,readDb().orders.filter(o=>o.userId===u.id));}
  if(req.method==='GET'&&url==='/api/admin/orders'){return json(res,200,readDb().orders);}
  if(req.method==='POST'&&url==='/api/admin/products'){const b=await body(req);if(!b.name||!Number.isFinite(Number(b.price))||!Number.isFinite(Number(b.stock)))return json(res,400,{error:'بيانات المنتج غير مكتملة'});const db=readDb();const product={id:Date.now(),name:String(b.name).trim(),price:Number(b.price),stock:Number(b.stock),category:b.category||'home',emoji:b.emoji||'🛍️',image:b.image||'',description:b.description||''};db.products.push(product);writeDb(db);return json(res,201,product);}
  if(req.method==='DELETE'&&url.startsWith('/api/admin/orders/')){const orderId=url.split('/').pop();const db=readDb();const before=db.orders.length;db.orders=db.orders.filter(o=>String(o.id)!==orderId);if(db.orders.length===before)return json(res,404,{error:'الطلب غير موجود'});writeDb(db);return json(res,200,{ok:true});}
  if(req.method==='PATCH'&&url.startsWith('/api/admin/orders/')){const orderId=url.split('/').pop();const b=await body(req);const db=readDb();const o=db.orders.find(x=>String(x.id)===orderId);if(!o)return json(res,404,{error:'الطلب غير موجود'});if(b.status && !ORDER_STATUSES.has(String(b.status)))return json(res,400,{error:'حالة الطلب غير صالحة'});if(b.status)o.status=String(b.status);writeDb(db);return json(res,200,o);}
  if(req.method==='DELETE'&&url.startsWith('/api/admin/products/')){const productId=url.split('/').pop();const db=readDb();const before=db.products.length;db.products=db.products.filter(p=>String(p.id)!==productId);if(db.products.length===before)return json(res,404,{error:'المنتج غير موجود'});writeDb(db);return json(res,200,{ok:true});}
  if(req.method==='PATCH'&&url.startsWith('/api/admin/products/')){const productId=url.split('/').pop();const b=await body(req);const db=readDb();const p=db.products.find(x=>String(x.id)===productId);if(!p)return json(res,404,{error:'المنتج غير موجود'});Object.assign(p,b);writeDb(db);return json(res,200,p);} 

  return json(res,404,{error:'المسار غير موجود'});
}
function publicUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,createdAt:u.createdAt};}
function login(res,u){const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,{userId:u.id,createdAt:Date.now()});res.setHeader('Set-Cookie',`loqata_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);return json(res,200,{user:publicUser(u)});}

const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/'))return await api(req,res,url.pathname);let file=url.pathname==='/'?'/index.html':url.pathname;const full=path.normalize(path.join(ROOT,file));if(!full.startsWith(ROOT)||!fs.existsSync(full)||fs.statSync(full).isDirectory())return json(res,404,{error:'Not found'});const ext=path.extname(full);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(full).pipe(res);}catch(e){console.error(e);json(res,500,{error:'Server error'});}});
server.listen(PORT,()=>console.log(`لقطة يعمل على http://localhost:${PORT}`));
