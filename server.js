const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createPaymentService } = require('./payment-service');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ORDER_STATUSES = new Set(['جديد','قيد التجهيز','تم الشحن','مكتمل','ملغي']);
const OTP_TTL_MS = 1000 * 60 * 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_MS = 1000 * 60;
const OTP_MAX_PER_HOUR = 5;
const paymentService = createPaymentService();
const DEFAULT_SHIPPING = { zones: [{id:'cairo',name:'القاهرة',fee:40},{id:'giza',name:'الجيزة',fee:50},{id:'alexandria',name:'الإسكندرية',fee:60},{id:'other',name:'محافظات أخرى',fee:80}], freeShippingThreshold:1000 };

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], products: [], orders: [], coupons: [], shipping: DEFAULT_SHIPPING, otpChallenges: [], notifications: [], campaigns: [] }, null, 2));
}
const readDb = () => { const db=JSON.parse(fs.readFileSync(DB_FILE,'utf8')); if(!db.shipping) db.shipping=DEFAULT_SHIPPING; if(!Array.isArray(db.notifications)) db.notifications=[]; if(!Array.isArray(db.campaigns)) db.campaigns=[]; if(!db.notificationSettings) db.notificationSettings=DEFAULT_NOTIFICATION_SETTINGS; if(!db.notificationTemplates) db.notificationTemplates=DEFAULT_NOTIFICATION_TEMPLATES; return db; };
const DEFAULT_NOTIFICATION_SETTINGS={customer:{order_created:true,order_status:true,shipping_update:true,payment_update:true},admin:{new_order:true,order_status:true,shipping_update:true,payment_update:true,campaign_created:true}};
const DEFAULT_NOTIFICATION_TEMPLATES={new_order:{title:'طلب جديد',message:'تم استلام طلب جديد #{orderId} بقيمة {total} ج.م.'},order_created:{title:'تم استلام طلبك',message:'تم إنشاء الطلب #{orderId} بقيمة {total} ج.م بنجاح.'},order_status:{title:'تحديث حالة الطلب',message:'الطلب #{orderId}: الحالة الآن {status}.'},shipping_update:{title:'تحديث شحنتك',message:'الطلب #{orderId}: حالة الشحن {shippingStatus}{tracking}.'},payment_update:{title:'تحديث الدفع',message:'الطلب #{orderId}: حالة الدفع {paymentStatus}.'},campaign_created:{title:'حملة جديدة',message:'تم إنشاء حملة جديدة: {campaignTitle}.'}};
const fillTemplate=(text,vars)=>String(text||'').replace(/\{(\w+)\}/g,(_,k)=>vars[k]??'');
const addNotification = (db, data) => { const role=data.role==='admin'?'admin':'customer'; const type=String(data.type||''); if(db.notificationSettings?.[role]?.[type]===false)return; const t=db.notificationTemplates?.[type]||{}; const vars=data.vars||{}; db.notifications.push({id:id('ntf'),read:false,createdAt:new Date().toISOString(),title:fillTemplate(data.title||t.title,vars),message:fillTemplate(data.message||t.message,vars),...data,role,type,title:fillTemplate(data.title||t.title,vars),message:fillTemplate(data.message||t.message,vars)}); if(db.notifications.length>2000)db.notifications=db.notifications.slice(-2000); };
const writeDb = db => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const json = (res, code, body) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
const parseCookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(x => { const i=x.indexOf('='); return [x.slice(0,i).trim(), decodeURIComponent(x.slice(i+1))]; }));
const hash = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') });
const verify = (password, user) => crypto.timingSafeEqual(Buffer.from(hash(password, user.salt).hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
const body = req => new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})});
const currentUser = req => { const sid=parseCookies(req).loqata_session; const session=sessions.get(sid); if(!session)return null; if(Date.now()-session.createdAt>SESSION_TTL_MS){sessions.delete(sid);return null;} return readDb().users.find(u=>u.id===session.userId)||null; };
const id = prefix => prefix + '_' + crypto.randomBytes(8).toString('hex');
const normalizePhone = value => String(value||'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g,'');
const sendOtp = async (phone, code) => {
  const webhook = process.env.OTP_WEBHOOK_URL;
  if (!webhook) { if (process.env.NODE_ENV === 'production') throw new Error('لم يتم إعداد مزود رسائل SMS للإنتاج'); return {devCode: code}; }
  const r = await fetch(webhook, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,code,message:`رمز تأكيد طلب لقطة: ${code}`})});
  if (!r.ok) throw new Error('تعذر إرسال رسالة التحقق');
  return {sent:true};
};

async function api(req,res,url){
  if(req.method==='POST' && url==='/api/otp/request'){
    const b=await body(req); const phone=normalizePhone(b.phone);
    if(!/^01\d{9}$/.test(phone)) return json(res,400,{error:'أدخل رقم هاتف مصري صحيح من 11 رقمًا'});
    const db=readDb(); db.otpChallenges=Array.isArray(db.otpChallenges)?db.otpChallenges:[];
    const now=Date.now(); db.otpChallenges=db.otpChallenges.filter(x=>now-x.createdAt<60*60*1000 && !x.verified);
    const recent=db.otpChallenges.filter(x=>x.phone===phone && now-x.createdAt<60*60*1000);
    if(recent.length>=OTP_MAX_PER_HOUR) return json(res,429,{error:'تم تجاوز حد طلبات التحقق. حاول لاحقًا'});
    const active=recent.find(x=>!x.verified && now-x.createdAt<OTP_RESEND_MS);
    if(active) return json(res,429,{error:'انتظر دقيقة قبل طلب رمز جديد'});
    const code=String(crypto.randomInt(100000,1000000)); const salt=crypto.randomBytes(16).toString('hex');
    const challenge={id:id('otp'),phone,salt,codeHash:crypto.scryptSync(code,salt,32).toString('hex'),createdAt:now,expiresAt:now+OTP_TTL_MS,attempts:0,verified:false};
    db.otpChallenges.push(challenge); writeDb(db);
    try { const delivery=await sendOtp(phone,code); return json(res,200,{challengeId:challenge.id,expiresIn:OTP_TTL_MS/1000,devCode:delivery.devCode||undefined,message:'تم إرسال رمز التحقق'}); }
    catch(e){ db.otpChallenges=db.otpChallenges.filter(x=>x.id!==challenge.id); writeDb(db); return json(res,502,{error:e.message||'تعذر إرسال رمز التحقق'}); }
  }
  if(req.method==='POST' && url==='/api/otp/verify'){
    const b=await body(req); const phone=normalizePhone(b.phone); const code=String(b.code||'').trim(); const db=readDb();
    const c=(db.otpChallenges||[]).find(x=>x.id===String(b.challengeId||'')&&x.phone===phone&&!x.verified);
    if(!c) return json(res,400,{error:'رمز التحقق غير صالح أو انتهت صلاحيته'});
    if(Date.now()>c.expiresAt) return json(res,400,{error:'انتهت صلاحية رمز التحقق. اطلب رمزًا جديدًا'});
    if(c.attempts>=OTP_MAX_ATTEMPTS) return json(res,429,{error:'تم تجاوز عدد المحاولات. اطلب رمزًا جديدًا'});
    c.attempts++;
    const supplied=crypto.scryptSync(code,c.salt,32).toString('hex');
    if(!crypto.timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(c.codeHash,'hex'))){writeDb(db);return json(res,400,{error:'رمز التحقق غير صحيح'});}
    c.verified=true; c.verifiedAt=Date.now(); c.verificationToken=id('vfy'); c.verificationTokenExpiresAt=Date.now()+10*60*1000; writeDb(db);
    return json(res,200,{verificationToken:c.verificationToken});
  }
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
  if(req.method==='GET'&&url==='/api/admin/notification-settings'){const db=readDb();return json(res,200,{settings:db.notificationSettings||DEFAULT_NOTIFICATION_SETTINGS,templates:db.notificationTemplates||DEFAULT_NOTIFICATION_TEMPLATES});}
  if(req.method==='PUT'&&url==='/api/admin/notification-settings'){const b=await body(req);const db=readDb();const settings={customer:{...DEFAULT_NOTIFICATION_SETTINGS.customer,...(b.settings?.customer||{})},admin:{...DEFAULT_NOTIFICATION_SETTINGS.admin,...(b.settings?.admin||{})}};for(const role of ['customer','admin'])for(const k of Object.keys(DEFAULT_NOTIFICATION_SETTINGS[role]))settings[role][k]=settings[role][k]===true;const templates={...DEFAULT_NOTIFICATION_TEMPLATES,...(b.templates||{})};for(const k of Object.keys(DEFAULT_NOTIFICATION_TEMPLATES)){templates[k]={title:String(templates[k]?.title||DEFAULT_NOTIFICATION_TEMPLATES[k].title).slice(0,120),message:String(templates[k]?.message||DEFAULT_NOTIFICATION_TEMPLATES[k].message).slice(0,500)}}db.notificationSettings=settings;db.notificationTemplates=templates;writeDb(db);return json(res,200,{settings,templates});}

  if(req.method==='GET' && url==='/api/profile'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});return json(res,200,{user:publicUser(u)});}
  if(req.method==='GET'&&url==='/api/products'){return json(res,200,readDb().products);}
  if(req.method==='GET'&&url==='/api/campaigns'){
    const db=readDb(); const now=Date.now();
    const items=(db.campaigns||[]).filter(c=>c.active!==false&&(!c.startsAt||new Date(c.startsAt).getTime()<=now)&&(!c.endsAt||new Date(c.endsAt).getTime()>=now)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return json(res,200,items);
  }
  if(req.method==='GET'&&url==='/api/shipping-settings'){const s=readDb().shipping||DEFAULT_SHIPPING;return json(res,200,s);}
  if(req.method==='GET'&&url==='/api/payments/config'){return json(res,200,{provider:paymentService.provider,currency:paymentService.currency,methods:paymentService.methods()});}
  if(req.method==='POST'&&url==='/api/payments/intents'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});const b=await body(req);if(String(b.paymentMethod||'')!=='card')return json(res,400,{error:'هذه العملية مخصصة للدفع الإلكتروني'});const amount=Number(b.amount);if(!Number.isFinite(amount)||amount<=0)return json(res,400,{error:'مبلغ الدفع غير صحيح'});const db=readDb();const order=db.orders.find(o=>String(o.id)===String(b.orderId)&&(!o.userId||o.userId===u.id));if(!order)return json(res,404,{error:'الطلب غير موجود'});const result=await paymentService.createIntent({orderId:String(b.orderId||''),amount,billingData:b.billingData||{},items:Array.isArray(b.items)?b.items:[]});if(result.status==='not_configured')return json(res,503,result);if(result.status!=='created')return json(res,502,result);order.paymentStatus='pending';order.paymentProvider=result.provider;order.paymentIntentId=result.intentionId||null;order.paymentUpdatedAt=new Date().toISOString();writeDb(db);return json(res,201,result);}
  if(req.method==='POST'&&url==='/api/payments/demo/complete'){if(process.env.PAYMENT_PROVIDER!=='demo')return json(res,404,{error:'وضع الدفع التجريبي غير مفعل'});const b=await body(req);const db=readDb();const order=db.orders.find(o=>String(o.id)===String(b.orderId));if(!order)return json(res,404,{error:'الطلب غير موجود'});if(order.paymentStatus==='paid')return json(res,200,{ok:true,order});const success=Boolean(b.success);order.paymentStatus=success?'paid':'failed';order.status=success?'قيد التجهيز':'ملغي';order.paymentUpdatedAt=new Date().toISOString();order.paymentReference=`demo_${crypto.randomBytes(6).toString('hex')}`;order.statusHistory=Array.isArray(order.statusHistory)?order.statusHistory:[];order.statusHistory.push({status:order.status,date:new Date().toISOString(),reason:success?'تم الدفع التجريبي':'فشل الدفع التجريبي'});writeDb(db);return json(res,200,{ok:true,order});}
  if(req.method==='POST'&&url==='/api/payments/webhook'){let raw='';req.on('data',c=>raw+=c);await new Promise(resolve=>req.on('end',resolve));let payload={};try{payload=JSON.parse(raw||'{}')}catch{return json(res,400,{error:'JSON غير صالح'});}const signature=req.headers['x-payment-signature']||req.headers['hmac'];if(!paymentService.verifyWebhook(payload,signature))return json(res,401,{error:'توقيع webhook غير صالح'});return json(res,200,{received:true});}
  if(req.method==='POST'&&url==='/api/checkout/quote'){
    const b=await body(req); const db=readDb(); const byId=new Map(db.products.map(p=>[String(p.id),p])); const itemsIn=Array.isArray(b.items)?b.items:[]; let subtotal=0; const items=[];
    for(const item of itemsIn){const p=byId.get(String(item.id)); const qty=Number(item.qty); if(!p||!Number.isInteger(qty)||qty<1||Number(p.stock||0)<qty)return json(res,400,{error:'أحد المنتجات غير متاح بالكمية المطلوبة'}); const activePrice=Number(p.salePrice||0)>0&&Number(p.salePrice)<Number(p.price||0)&&(!p.offerEndsAt||new Date(p.offerEndsAt)>new Date())?Number(p.salePrice):Number(p.price||0); items.push({id:p.id,name:p.name,qty,price:activePrice,originalPrice:Number(p.price||0),salePrice:activePrice<Number(p.price||0)?activePrice:null}); subtotal+=qty*activePrice; }
    const now=Date.now(); const campaigns=(db.campaigns||[]).filter(c=>c.active!==false&&(!c.startsAt||new Date(c.startsAt).getTime()<=now)&&(!c.endsAt||new Date(c.endsAt).getTime()>=now));
    let couponCode=String(b.couponCode||'').trim().toUpperCase(); let appliedCampaign=null;
    if(!couponCode){const campaign=campaigns.find(c=>c.couponCode&&db.coupons.some(x=>x.code===String(c.couponCode).toUpperCase()&&x.active!==false)); if(campaign){couponCode=String(campaign.couponCode).toUpperCase();appliedCampaign=campaign;}}
    const coupon=(db.coupons||[]).find(c=>c.code===couponCode&&c.active!==false); let discount=0; let couponLabel='';
    if(coupon){if(coupon.expiresAt&&new Date(coupon.expiresAt)<new Date())return json(res,400,{error:'انتهت صلاحية الكوبون'});if(coupon.minSubtotal&&subtotal<Number(coupon.minSubtotal)) { if(b.couponCode) return json(res,400,{error:`الحد الأدنى لاستخدام الكوبون هو ${coupon.minSubtotal}`}); couponCode=''; } else {discount=coupon.type==='percent'?Math.min(subtotal,subtotal*Number(coupon.value)/100):Math.min(subtotal,Number(coupon.value));couponLabel=coupon.label||'خصم';}}
    const after=Math.max(0,subtotal-discount); const shipping=(db.shipping?.zones||[]).find(z=>z.id===String(b.shippingZone))||null; const shippingFee=shipping?(after>=Number(db.shipping?.freeShippingThreshold||0)?0:Number(shipping.fee||0)):0;
    return json(res,200,{items,subtotal,discount,shippingFee,total:after+shippingFee,couponCode:couponCode||null,couponLabel,appliedCampaign:appliedCampaign?{id:appliedCampaign.id,title:appliedCampaign.title}:null});
  }
  if(req.method==='POST'&&url==='/api/coupons/validate'){
    const b=await body(req); const code=String(b.code||'').trim().toUpperCase(); const subtotal=Number(b.subtotal||0); const coupon=readDb().coupons.find(c=>c.code===code&&c.active!==false);
    if(!coupon)return json(res,404,{error:'كود الخصم غير صحيح أو غير فعال'});
    if(coupon.expiresAt&&new Date(coupon.expiresAt)<new Date())return json(res,400,{error:'انتهت صلاحية الكوبون'});
    if(coupon.minSubtotal&&subtotal<Number(coupon.minSubtotal))return json(res,400,{error:`الحد الأدنى لاستخدام الكوبون هو ${coupon.minSubtotal}`});
    const discount=coupon.type==='percent'?Math.min(subtotal,subtotal*Number(coupon.value)/100):Math.min(subtotal,Number(coupon.value));
    return json(res,200,{code,discount,total:Math.max(0,subtotal-discount),label:coupon.label||'خصم'});
  }
  if(url==='/api/admin/coupons' && req.method==='GET'){return json(res,200,readDb().coupons||[]);}
  if(url==='/api/admin/campaigns' && req.method==='GET'){return json(res,200,readDb().campaigns||[]);}
  if(url==='/api/admin/campaigns' && req.method==='POST'){
    const b=await body(req); const title=String(b.title||'').trim(), message=String(b.message||'').trim();
    if(!title||!message)return json(res,400,{error:'عنوان الحملة ورسالتها مطلوبان'});
    const startsAt=b.startsAt||null, endsAt=b.endsAt||null;
    if(startsAt&&endsAt&&new Date(startsAt)>=new Date(endsAt))return json(res,400,{error:'تاريخ نهاية الحملة يجب أن يكون بعد البداية'});
    const db=readDb(); db.campaigns=db.campaigns||[];
    const campaign={id:id('cmp'),title,message,ctaLabel:String(b.ctaLabel||'').trim(),couponCode:String(b.couponCode||'').trim().toUpperCase()||null,startsAt,endsAt,active:b.active!==false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    db.campaigns.unshift(campaign);
    addNotification(db,{role:'admin',type:'campaign_created',title:'تم إنشاء حملة جديدة',message:`تم إنشاء الحملة: ${campaign.title}.`});
    writeDb(db); return json(res,201,campaign);
  }
  if(url.startsWith('/api/admin/campaigns/') && req.method==='PATCH'){
    const campaignId=url.split('/').pop(); const b=await body(req); const db=readDb(); const c=(db.campaigns||[]).find(x=>x.id===campaignId); if(!c)return json(res,404,{error:'الحملة غير موجودة'});
    if(b.title!==undefined)c.title=String(b.title).trim(); if(b.message!==undefined)c.message=String(b.message).trim(); if(b.ctaLabel!==undefined)c.ctaLabel=String(b.ctaLabel).trim(); if(b.couponCode!==undefined)c.couponCode=String(b.couponCode||'').trim().toUpperCase()||null; if(b.startsAt!==undefined)c.startsAt=b.startsAt||null; if(b.endsAt!==undefined)c.endsAt=b.endsAt||null; if(c.startsAt&&c.endsAt&&new Date(c.startsAt)>=new Date(c.endsAt))return json(res,400,{error:'تاريخ نهاية الحملة يجب أن يكون بعد البداية'}); if(b.active!==undefined)c.active=b.active===true; c.updatedAt=new Date().toISOString(); writeDb(db); return json(res,200,c);
  }
  if(url.startsWith('/api/admin/campaigns/') && req.method==='DELETE'){
    const campaignId=url.split('/').pop(); const db=readDb(); const before=(db.campaigns||[]).length; db.campaigns=(db.campaigns||[]).filter(c=>c.id!==campaignId); if(db.campaigns.length===before)return json(res,404,{error:'الحملة غير موجودة'}); writeDb(db); return json(res,200,{ok:true});
  }
  if(url==='/api/admin/shipping' && req.method==='GET'){return json(res,200,readDb().shipping||DEFAULT_SHIPPING);}
  if(url==='/api/admin/shipping' && req.method==='PUT'){const b=await body(req);if(!Array.isArray(b.zones)||!Number.isFinite(Number(b.freeShippingThreshold))||b.zones.some(z=>!z.id||!z.name||!Number.isFinite(Number(z.fee))||Number(z.fee)<0))return json(res,400,{error:'إعدادات الشحن غير صحيحة'});const db=readDb();db.shipping={zones:b.zones.map(z=>({id:String(z.id),name:String(z.name).trim(),fee:Number(z.fee)})),freeShippingThreshold:Math.max(0,Number(b.freeShippingThreshold))};writeDb(db);return json(res,200,db.shipping);}
  if(url==='/api/admin/coupons' && req.method==='POST'){
    const b=await body(req); const code=String(b.code||'').trim().toUpperCase(); const value=Number(b.value);
    if(!code||!['percent','fixed'].includes(b.type)||!Number.isFinite(value)||value<=0)return json(res,400,{error:'بيانات الكوبون غير صحيحة'});
    const db=readDb(); db.coupons=db.coupons||[]; if(db.coupons.some(c=>c.code===code))return json(res,409,{error:'الكوبون موجود بالفعل'});
    const coupon={id:id('cpn'),code,type:b.type,value,minSubtotal:Math.max(0,Number(b.minSubtotal||0)),expiresAt:b.expiresAt||null,label:b.label||'خصم',active:true}; db.coupons.push(coupon);writeDb(db);return json(res,201,coupon);
  }
  if(url.startsWith('/api/admin/coupons/') && req.method==='DELETE'){
    const couponId=url.split('/').pop(); const db=readDb(); const before=(db.coupons||[]).length; db.coupons=(db.coupons||[]).filter(c=>c.id!==couponId); if(db.coupons.length===before)return json(res,404,{error:'الكوبون غير موجود'});writeDb(db);return json(res,200,{ok:true});
  }
  if(req.method==='POST'&&url==='/api/orders'){
    const u=currentUser(req); const b=await body(req);
    if(!b.name||!b.phone||!b.address||!Array.isArray(b.items)||!b.items.length)return json(res,400,{error:'بيانات الطلب غير مكتملة'});
    const paymentMethod=String(b.paymentMethod||'cod');
    if(!['cod','card'].includes(paymentMethod))return json(res,400,{error:'طريقة الدفع غير صالحة'});
    const normalizedPhone=normalizePhone(b.phone); if(!/^01\d{9}$/.test(normalizedPhone))return json(res,400,{error:'رقم الهاتف غير صحيح'});
    const db=readDb();
    if(paymentMethod==='card' && (!u || u.role!=='customer')) return json(res,401,{error:'يجب تسجيل الدخول لاستخدام الدفع الإلكتروني'});
    let verification=null;
    if(paymentMethod==='cod'){
      verification=(db.otpChallenges||[]).find(x=>x.verificationToken===String(b.verificationToken||'')&&x.phone===normalizedPhone&&x.verified&&x.verificationTokenExpiresAt>Date.now());
      if(!verification)return json(res,401,{error:'يجب تأكيد رقم الهاتف برمز OTP قبل اعتماد طلب الدفع عند الاستلام'});
      verification.consumedAt=Date.now(); verification.verificationToken=null;
    }
    let couponCode=String(b.couponCode||'').trim().toUpperCase(); const now=Date.now(); if(!couponCode){const autoCampaign=(db.campaigns||[]).find(c=>c.active!==false&&c.couponCode&&(!c.startsAt||new Date(c.startsAt).getTime()<=now)&&(!c.endsAt||new Date(c.endsAt).getTime()>=now)&&(db.coupons||[]).some(x=>x.code===String(c.couponCode).toUpperCase()&&x.active!==false)); if(autoCampaign)couponCode=String(autoCampaign.couponCode).toUpperCase();} const coupon=(db.coupons||[]).find(c=>c.code===couponCode&&c.active!==false); const byId=new Map(db.products.map(p=>[String(p.id),p])); let subtotal=0; const items=[];
    for(const item of b.items){const p=byId.get(String(item.id));const qty=Number(item.qty);if(!p||!Number.isInteger(qty)||qty<1||Number(p.stock||0)<qty)return json(res,400,{error:'أحد المنتجات غير متاح بالكمية المطلوبة'});const activePrice=Number(p.salePrice||0)>0&&Number(p.salePrice)<Number(p.price||0)&&(!p.offerEndsAt||new Date(p.offerEndsAt)>new Date())?Number(p.salePrice):Number(p.price||0);items.push({id:p.id,name:p.name,qty,price:activePrice,originalPrice:Number(p.price||0),salePrice:activePrice<Number(p.price||0)?activePrice:null});subtotal+=qty*activePrice;}
    for(const item of items){const p=byId.get(String(item.id));p.stock=Number(p.stock||0)-item.qty;}
    let discount=0;if(coupon){if(coupon.expiresAt&&new Date(coupon.expiresAt)<new Date())return json(res,400,{error:'انتهت صلاحية الكوبون'});if(coupon.minSubtotal&&subtotal<Number(coupon.minSubtotal))return json(res,400,{error:`الحد الأدنى لاستخدام الكوبون هو ${coupon.minSubtotal}`});discount=coupon.type==='percent'?Math.min(subtotal,subtotal*Number(coupon.value)/100):Math.min(subtotal,Number(coupon.value));} const afterDiscount=Math.max(0,subtotal-discount);const shipping=(db.shipping?.zones||[]).find(z=>z.id===String(b.shippingZone))||null;if(!shipping)return json(res,400,{error:'اختر منطقة توصيل صحيحة'});const shippingFee=afterDiscount>=Number(db.shipping?.freeShippingThreshold||0)?0:Number(shipping.fee||0);const total=afterDiscount+shippingFee; const order={id:id('ord'),userId:u?.id||null,date:new Date().toISOString(),name:String(b.name).trim(),phone:normalizedPhone,address:String(b.address).trim(),shippingZone:shipping.id,shippingZoneName:shipping.name,paymentMethod,paymentMethodName:paymentMethod==='card'?'الدفع الإلكتروني':'الدفع عند الاستلام',paymentStatus:paymentMethod==='card'?'pending':'unpaid',subtotal,discount,shippingFee,total,items,status:'جديد',statusHistory:[{status:'جديد',date:new Date().toISOString()}]};db.orders.unshift(order);if(u?.id)addNotification(db,{userId:u.id,role:'customer',type:'order_created',orderId:order.id,vars:{orderId:order.id,total}});addNotification(db,{role:'admin',type:'new_order',orderId:order.id,vars:{orderId:order.id,total},title:'طلب جديد',message:`تم استلام طلب جديد #${order.id} من ${order.name} بقيمة ${total} ج.م.`});writeDb(db);return json(res,201,order);
  }
  if(req.method==='GET'&&url==='/api/payments/status'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});const o=readDb().orders.find(x=>String(x.id)===String(new URLSearchParams((new URL(req.url,'http://localhost')).search).get('orderId'))&&(!x.userId||x.userId===u.id));if(!o)return json(res,404,{error:'الطلب غير موجود'});return json(res,200,{orderId:o.id,paymentStatus:o.paymentStatus||'unknown',status:o.status});}
  if(req.method==='GET'&&url==='/api/orders/mine'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});return json(res,200,readDb().orders.filter(o=>o.userId===u.id));}
  if(req.method==='GET'&&url==='/api/notifications'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});const db=readDb();const notes=db.notifications.filter(n=>n.userId===u.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));return json(res,200,{items:notes,unread:notes.filter(n=>!n.read).length});}
  if(req.method==='POST'&&url==='/api/notifications/read-all'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});const db=readDb();db.notifications.filter(n=>n.userId===u.id).forEach(n=>n.read=true);writeDb(db);return json(res,200,{ok:true});}
  if(req.method==='POST'&&url==='/api/notifications/read'){const u=currentUser(req);if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});const b=await body(req);const db=readDb();const n=db.notifications.find(x=>x.id===String(b.id)&&x.userId===u.id);if(!n)return json(res,404,{error:'الإشعار غير موجود'});n.read=true;writeDb(db);return json(res,200,{ok:true});}
  if(req.method==='GET'&&url==='/api/admin/notifications'){const db=readDb();const notes=db.notifications.filter(n=>n.role==='admin').sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100);return json(res,200,{items:notes,unread:notes.filter(n=>!n.read).length});}
  if(req.method==='POST'&&url==='/api/admin/notifications/read-all'){const db=readDb();db.notifications.filter(n=>n.role==='admin').forEach(n=>n.read=true);writeDb(db);return json(res,200,{ok:true});}
  if(req.method==='GET'&&url==='/api/admin/orders'){return json(res,200,readDb().orders);}
  if(req.method==='GET'&&url==='/api/admin/customers'){
    const db=readDb(); const by=new Map();
    for(const u of db.users.filter(x=>x.role==='customer')) by.set(u.id,{id:u.id,name:u.name||'',email:u.email||'',createdAt:u.createdAt||null,orders:0,totalSpent:0,lastOrderAt:null,phone:''});
    for(const o of db.orders){
      if(o.userId && by.has(o.userId)){const c=by.get(o.userId);c.orders++;c.totalSpent+=Number(o.total||0);c.lastOrderAt=!c.lastOrderAt||new Date(o.date)>new Date(c.lastOrderAt)?o.date:c.lastOrderAt;c.phone=o.phone||c.phone;}
    }
    return json(res,200,[...by.values()].sort((a,b)=>new Date(b.lastOrderAt||b.createdAt||0)-new Date(a.lastOrderAt||a.createdAt||0)));
  }
  if(req.method==='GET'&&url.startsWith('/api/admin/customers/')){
    const customerId=decodeURIComponent(url.split('/').pop()); const db=readDb(); const u=db.users.find(x=>x.id===customerId&&x.role==='customer');
    if(!u)return json(res,404,{error:'العميل غير موجود'});
    const customerOrders=db.orders.filter(o=>o.userId===u.id); return json(res,200,{customer:{...publicUser(u),phone:customerOrders[0]?.phone||''},orders:customerOrders});
  }
  if(req.method==='POST'&&url==='/api/admin/products'){const b=await body(req);if(!b.name||!Number.isFinite(Number(b.price))||!Number.isFinite(Number(b.stock)))return json(res,400,{error:'بيانات المنتج غير مكتملة'});const db=readDb();const product={id:Date.now(),name:String(b.name).trim(),price:Number(b.price),stock:Number(b.stock),category:b.category||'home',emoji:b.emoji||'🛍️',image:b.image||'',description:b.description||''};db.products.push(product);writeDb(db);return json(res,201,product);}
  // v4.4.0: إدارة الشحن والتتبع
  const shippingMatch=url.match(/^\/api\/admin\/orders\/([^/]+)\/shipping$/);
  if(shippingMatch && req.method==='GET'){
    const orderId=decodeURIComponent(shippingMatch[1]); const db=readDb(); const o=db.orders.find(x=>String(x.id)===orderId);
    if(!o)return json(res,404,{error:'الطلب غير موجود'});
    return json(res,200,{orderId:o.id,shipping:{carrier:o.shippingCarrier||'',trackingNumber:o.trackingNumber||'',trackingUrl:o.trackingUrl||'',status:o.shippingStatus||'preparing',shippedAt:o.shippedAt||null,deliveredAt:o.deliveredAt||null},timeline:Array.isArray(o.shippingTimeline)?o.shippingTimeline:[]});
  }
  if(shippingMatch && req.method==='PATCH'){
    const orderId=decodeURIComponent(shippingMatch[1]); const b=await body(req); const db=readDb(); const o=db.orders.find(x=>String(x.id)===orderId);
    if(!o)return json(res,404,{error:'الطلب غير موجود'});
    const allowed=new Set(['preparing','shipped','in_transit','delivered','returned']);
    const status=b.status===undefined?(o.shippingStatus||'preparing'):String(b.status);
    if(!allowed.has(status))return json(res,400,{error:'حالة الشحن غير صالحة'});
    const carrier=b.carrier===undefined?(o.shippingCarrier||''):String(b.carrier).trim();
    const tracking=b.trackingNumber===undefined?(o.trackingNumber||''):String(b.trackingNumber).trim();
    const trackingUrl=b.trackingUrl===undefined?(o.trackingUrl||''):String(b.trackingUrl).trim();
    if(trackingUrl && !/^https:\/\//i.test(trackingUrl)) return json(res,400,{error:'رابط التتبع يجب أن يبدأ بـ https://'});
    o.shippingCarrier=carrier; o.trackingNumber=tracking; o.trackingUrl=trackingUrl; o.shippingStatus=status;
    const now=new Date().toISOString(); o.shippingTimeline=Array.isArray(o.shippingTimeline)?o.shippingTimeline:[];
    const old=o.shippingTimeline.at(-1)?.status || 'preparing';
    if(status!==old || b.note){ o.shippingTimeline.push({id:id('ship_evt'),status,title:({preparing:'تجهيز الشحنة',shipped:'تم الشحن',in_transit:'الشحنة في الطريق',delivered:'تم التسليم',returned:'مرتجع'})[status],note:String(b.note||'').trim(),date:now,actorName:'مدير المتجر'}); }
    if(status==='shipped'&&!o.shippedAt)o.shippedAt=now;
    if(status==='delivered')o.deliveredAt=o.deliveredAt||now;
    if(status==='shipped' && o.status!=='تم الشحن'){o.status='تم الشحن';o.statusHistory=Array.isArray(o.statusHistory)?o.statusHistory:[];o.statusHistory.push({status:o.status,date:now});}
    if(status==='delivered' && o.status!=='مكتمل'){o.status='مكتمل';o.statusHistory=Array.isArray(o.statusHistory)?o.statusHistory:[];o.statusHistory.push({status:o.status,date:now});}
    o.updatedAt=now;const shippingLabels={preparing:'قيد التجهيز',shipped:'تم الشحن',in_transit:'في الطريق',delivered:'تم التسليم',returned:'مرتجع'};if(status!==old||b.note){if(o.userId)addNotification(db,{userId:o.userId,role:'customer',type:'shipping_update',orderId:o.id,vars:{orderId:o.id,shippingStatus:shippingLabels[status],tracking:tracking?` — رقم التتبع ${tracking}`:''}});addNotification(db,{role:'admin',type:'shipping_update',orderId:o.id,title:'تحديث شحنة',message:`تم تحديث شحنة الطلب #${o.id} إلى: ${shippingLabels[status]}.`,vars:{orderId:o.id,shippingStatus:shippingLabels[status],tracking:tracking?` — رقم التتبع ${tracking}`:''}});}writeDb(db); return json(res,200,{order:o,shipping:{carrier,trackingNumber:tracking,trackingUrl,status,shippedAt:o.shippedAt||null,deliveredAt:o.deliveredAt||null},timeline:o.shippingTimeline});
  }
  const customerTrackMatch=url.match(/^\/api\/orders\/([^/]+)\/tracking$/);
  if(customerTrackMatch && req.method==='GET'){
    const u=currentUser(req); if(!u)return json(res,401,{error:'يجب تسجيل الدخول'});
    const orderId=decodeURIComponent(customerTrackMatch[1]); const db=readDb(); const o=db.orders.find(x=>String(x.id)===orderId&&x.userId===u.id);
    if(!o)return json(res,404,{error:'الطلب غير موجود'});
    return json(res,200,{orderId:o.id,status:o.status,shipping:{carrier:o.shippingCarrier||'',trackingNumber:o.trackingNumber||'',trackingUrl:o.trackingUrl||'',status:o.shippingStatus||'preparing',shippedAt:o.shippedAt||null,deliveredAt:o.deliveredAt||null},timeline:Array.isArray(o.shippingTimeline)?o.shippingTimeline:[]});
  }
  if(req.method==='GET'&&url.startsWith('/api/admin/orders/')&&url.endsWith('/details')){
    const orderId=url.split('/')[4]; const db=readDb(); const o=db.orders.find(x=>String(x.id)===String(orderId));
    if(!o)return json(res,404,{error:'الطلب غير موجود'});
    const timeline=Array.isArray(o.timeline)?o.timeline:(Array.isArray(o.statusHistory)?o.statusHistory.map(x=>({type:'status',title:`حالة الطلب: ${x.status}`,note:'',date:x.date,actorName:'مدير المتجر'})):[]);
    return json(res,200,{order:o,timeline,notes:Array.isArray(o.adminNotes)?o.adminNotes:[]});
  }
  if(req.method==='POST'&&url.startsWith('/api/admin/orders/')&&url.endsWith('/notes')){
    const orderId=url.split('/')[4]; const b=await body(req); const text=String(b.text||'').trim();
    if(!text||text.length>1000)return json(res,400,{error:'الملاحظة مطلوبة وبحد أقصى 1000 حرف'});
    const db=readDb(); const o=db.orders.find(x=>String(x.id)===String(orderId)); if(!o)return json(res,404,{error:'الطلب غير موجود'});
    o.adminNotes=Array.isArray(o.adminNotes)?o.adminNotes:[]; o.timeline=Array.isArray(o.timeline)?o.timeline:[];
    const now=new Date().toISOString(); o.adminNotes.push({id:id('note'),text,date:now,actorName:'مدير المتجر'});
    o.timeline.push({id:id('evt'),type:'note',title:'إضافة ملاحظة',note:text,date:now,actorName:'مدير المتجر'});
    writeDb(db); return json(res,200,{order:o,timeline:o.timeline,notes:o.adminNotes});
  }
  if(req.method==='PATCH'&&url.startsWith('/api/admin/orders/')&&url.endsWith('/details')){
    const orderId=url.split('/')[4]; const b=await body(req); const db=readDb(); const o=db.orders.find(x=>String(x.id)===String(orderId));
    if(!o)return json(res,404,{error:'الطلب غير موجود'});
    if(b.status && !ORDER_STATUSES.has(String(b.status)))return json(res,400,{error:'حالة الطلب غير صالحة'});
    const now=new Date().toISOString(); o.timeline=Array.isArray(o.timeline)?o.timeline:[]; o.statusHistory=Array.isArray(o.statusHistory)?o.statusHistory:[];
    if(b.status && String(b.status)!==String(o.status)){
      const from=o.status||'غير محدد'; o.status=String(b.status); o.statusHistory.push({status:o.status,date:now});
      o.timeline.push({id:id('evt'),type:'status',title:`تغيير الحالة: ${o.status}`,note:`من: ${from} ← إلى: ${o.status}`,date:now,actorName:'مدير المتجر'});if(o.userId)addNotification(db,{userId:o.userId,role:'customer',type:'order_status',orderId:o.id,vars:{orderId:o.id,status:o.status}});addNotification(db,{role:'admin',type:'order_status',orderId:o.id,title:'تغيير حالة طلب',message:`الطلب #${o.id}: ${from} ← ${o.status}.`,vars:{orderId:o.id,status:o.status}});
    }
    if(b.paymentStatus!==undefined && String(b.paymentStatus)!==String(o.paymentStatus||'')){
      const old=o.paymentStatus||'غير محدد'; o.paymentStatus=String(b.paymentStatus);
      if(o.userId)addNotification(db,{userId:o.userId,role:'customer',type:'payment_update',orderId:o.id,vars:{orderId:o.id,paymentStatus:o.paymentStatus}});
      addNotification(db,{role:'admin',type:'payment_update',orderId:o.id,title:'تحديث دفع',message:`تم تحديث دفع الطلب #${o.id} إلى ${o.paymentStatus}.`,vars:{orderId:o.id,paymentStatus:o.paymentStatus}});
      o.timeline.push({id:id('evt'),type:'payment',title:'تحديث حالة الدفع',note:`من: ${old} ← إلى: ${o.paymentStatus}`,date:now,actorName:'مدير المتجر'});
    }
    if(b.shippingCarrier!==undefined && String(b.shippingCarrier)!==String(o.shippingCarrier||'')){o.shippingCarrier=String(b.shippingCarrier).trim();o.timeline.push({id:id('evt'),type:'shipping',title:'تحديث شركة الشحن',note:o.shippingCarrier||'تم حذف شركة الشحن',date:now,actorName:'مدير المتجر'});}
    if(b.trackingNumber!==undefined && String(b.trackingNumber)!==String(o.trackingNumber||'')){o.trackingNumber=String(b.trackingNumber).trim();o.timeline.push({id:id('evt'),type:'shipping',title:'تحديث رقم التتبع',note:o.trackingNumber||'تم حذف رقم التتبع',date:now,actorName:'مدير المتجر'});}
    o.updatedAt=now; writeDb(db); return json(res,200,o);
  }
  if(req.method==='DELETE'&&url.startsWith('/api/admin/orders/')){const orderId=url.split('/').pop();const db=readDb();const before=db.orders.length;db.orders=db.orders.filter(o=>String(o.id)!==orderId);if(db.orders.length===before)return json(res,404,{error:'الطلب غير موجود'});writeDb(db);return json(res,200,{ok:true});}
  if(req.method==='PATCH'&&url.startsWith('/api/admin/orders/')){const orderId=url.split('/').pop();const b=await body(req);const db=readDb();const o=db.orders.find(x=>String(x.id)===orderId);if(!o)return json(res,404,{error:'الطلب غير موجود'});if(b.status && !ORDER_STATUSES.has(String(b.status)))return json(res,400,{error:'حالة الطلب غير صالحة'});if(b.status){const oldStatus=o.status;o.status=String(b.status);o.statusHistory=Array.isArray(o.statusHistory)?o.statusHistory:[];const now=new Date().toISOString();o.statusHistory.push({status:o.status,date:now});if(o.userId&&oldStatus!==o.status)addNotification(db,{userId:o.userId,role:'customer',type:'order_status',orderId:o.id,vars:{orderId:o.id,status:o.status}});addNotification(db,{role:'admin',type:'order_status',orderId:o.id,title:'تغيير حالة طلب',message:`الطلب #${o.id}: ${oldStatus||'غير محدد'} ← ${o.status}.`,vars:{orderId:o.id,status:o.status}});}writeDb(db);return json(res,200,o);}
  if(req.method==='DELETE'&&url.startsWith('/api/admin/products/')){const productId=url.split('/').pop();const db=readDb();const before=db.products.length;db.products=db.products.filter(p=>String(p.id)!==productId);if(db.products.length===before)return json(res,404,{error:'المنتج غير موجود'});writeDb(db);return json(res,200,{ok:true});}
  if(req.method==='PATCH'&&url.startsWith('/api/admin/products/')){const productId=url.split('/').pop();const b=await body(req);const db=readDb();const p=db.products.find(x=>String(x.id)===productId);if(!p)return json(res,404,{error:'المنتج غير موجود'});Object.assign(p,b);writeDb(db);return json(res,200,p);} 

  return json(res,404,{error:'المسار غير موجود'});
}
function publicUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,createdAt:u.createdAt};}
function login(res,u){const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,{userId:u.id,createdAt:Date.now()});res.setHeader('Set-Cookie',`loqata_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);return json(res,200,{user:publicUser(u)});}

const server=http.createServer(async(req,res)=>{try{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'");const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname === '/api/health') return json(res,200,{ok:true,env:NODE_ENV,service:'loqata'});if(url.pathname.startsWith('/api/'))return await api(req,res,url.pathname);let file=url.pathname==='/'?'/index.html':url.pathname;const full=path.normalize(path.join(ROOT,file));if(!full.startsWith(ROOT)||!fs.existsSync(full)||fs.statSync(full).isDirectory())return json(res,404,{error:'Not found'});const ext=path.extname(full);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(full).pipe(res);}catch(e){console.error(e);json(res,500,{error:'Server error'});}});
server.listen(PORT,()=>console.log(`لقطة يعمل على http://localhost:${PORT}`));
