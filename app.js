document.addEventListener("click",e=>{const copy=e.target.closest("[data-campaign-coupon]");if(copy){navigator.clipboard?.writeText(copy.dataset.campaignCoupon);if($("couponCode"))$("couponCode").value=copy.dataset.campaignCoupon;toast("تم نسخ كود الحملة");return;}const toggle=e.target.closest("[data-toggle-campaign]");if(toggle){const c=adminCampaigns.find(x=>x.id===toggle.dataset.toggleCampaign);if(c)apiRequest(`/api/admin/campaigns/${c.id}`,{method:"PATCH",body:JSON.stringify({active:c.active===false})}).then(saved=>{adminCampaigns=adminCampaigns.map(x=>x.id===saved.id?saved:x);renderAdminCampaigns();loadCampaigns();toast("تم تحديث الحملة");}).catch(err=>toast(err.message));return;}const delCampaign=e.target.closest("[data-delete-campaign]");if(delCampaign){apiRequest(`/api/admin/campaigns/${delCampaign.dataset.deleteCampaign}`,{method:"DELETE"}).then(()=>{adminCampaigns=adminCampaigns.filter(x=>x.id!==delCampaign.dataset.deleteCampaign);renderAdminCampaigns();loadCampaigns();toast("تم حذف الحملة");}).catch(err=>toast(err.message));return;}const delCoupon=e.target.closest("[data-delete-coupon]");if(delCoupon){apiRequest(`/api/admin/coupons/${delCoupon.dataset.deleteCoupon}`,{method:"DELETE"}).then(()=>{adminCoupons=adminCoupons.filter(c=>c.id!==delCoupon.dataset.deleteCoupon);renderAdmin();toast("تم حذف الكوبون");}).catch(err=>toast(err.message));}});
const defaultProducts = [
  {id:1,name:"سماعة بلوتوث",price:450,category:"electronics",emoji:"🎧",image:"",description:"سماعة بلوتوث لاسلكية بصوت واضح وتصميم مريح للاستخدام اليومي.",stock:20},
  {id:2,name:"ساعة ذكية",price:850,category:"electronics",emoji:"⌚",image:"",description:"ساعة ذكية أنيقة لمتابعة الوقت والنشاط اليومي مع تصميم عملي.",stock:12},
  {id:3,name:"تيشيرت كاجوال",price:320,category:"fashion",emoji:"👕",image:"",description:"تيشيرت كاجوال مريح مناسب للخروجات والاستخدام اليومي.",stock:25},
  {id:4,name:"شنطة ظهر",price:390,category:"fashion",emoji:"🎒",image:"",description:"شنطة ظهر عملية لحمل الأدوات والمستلزمات بسهولة.",stock:15},
  {id:5,name:"كوب حراري",price:220,category:"home",emoji:"☕",image:"",description:"كوب حراري مناسب للمشروبات الساخنة والباردة أثناء التنقل.",stock:18},
  {id:6,name:"مصباح مكتب",price:280,category:"home",emoji:"💡",image:"",description:"مصباح مكتب بإضاءة مناسبة للمذاكرة والعمل والقراءة.",stock:10},
  {id:7,name:"شاحن سريع",price:250,category:"electronics",emoji:"🔌",image:"",description:"شاحن سريع للاستخدام اليومي مع تصميم صغير وسهل الحمل.",stock:30},
  {id:8,name:"حافظة هاتف",price:150,category:"electronics",emoji:"📱",image:"",description:"حافظة هاتف خفيفة تساعد على حماية الهاتف من الخدوش والصدمات البسيطة.",stock:22}
];
const whatsappNumber = "201149902302";
const $ = id => document.getElementById(id);
const money = n => `${Number(n || 0).toLocaleString("ar-EG")} ج.م`;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
const imageMarkup = (p, cls="product-img") => p.image ? `<img class="${cls}-photo" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : "";
const visualMarkup = (p, cls="product-img") => `<div class="${cls}">${imageMarkup(p, cls)}<span class="${cls}-fallback" ${p.image ? 'style="display:none"' : ''}>${escapeHtml(p.emoji || "🛍️")}</span></div>`;
function readJson(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
let products = defaultProducts.map(p=>({...p})); try { localStorage.setItem("loqataProducts",JSON.stringify(products)); } catch {}
let cart = readJson("loqataCart", []); if (!Array.isArray(cart)) cart = [];
let orders = readJson("loqataOrders", []); if (!Array.isArray(orders)) orders = [];
let favorites = readJson("loqataFavorites", []); if (!Array.isArray(favorites)) favorites = [];
let currentCategory = "all";
let favoritesOnly = false;
let minPriceFilter = "";
let maxPriceFilter = "";
let ratingFilter = 0;
let offerFilter = "all";
let sortFilter = "default";
let adminOrderQuery = "";
let adminOrderDetailsId = null;
let customer = readJson("loqataCustomer", {name:"",phone:"",address:""});
const DEFAULT_SHIPPING_SETTINGS={zones:[{id:"cairo",name:"القاهرة",fee:40},{id:"giza",name:"الجيزة",fee:50},{id:"alexandria",name:"الإسكندرية",fee:60},{id:"other",name:"محافظات أخرى",fee:80}],freeShippingThreshold:1000};
let shippingSettings = JSON.parse(JSON.stringify(DEFAULT_SHIPPING_SETTINGS));
let selectedCoupon = null;
let loyalty = {points:0, config:{pointsPerCurrency:0.1,pointValue:1,minRedeem:10}};
let campaigns = [];
let adminCampaigns = [];
let otpState = {challengeId:"",phone:"",name:"",address:"",couponCode:""};
let adminUnlocked = false;
let adminUser = null;
function saveCustomer(){
  const clean={
    name:String(customer?.name||"").trim(),
    phone:String(customer?.phone||"").trim(),
    address:String(customer?.address||"").trim()
  };
  customer=clean;
  try{
    localStorage.setItem("loqataCustomer",JSON.stringify(clean));
    localStorage.setItem("loqataCustomerName",clean.name);
    localStorage.setItem("loqataCustomerPhone",clean.phone);
    localStorage.setItem("loqataCustomerAddress",clean.address);
  }catch{}
}
function getSavedCustomer(){
  const saved=readJson("loqataCustomer",{});
  let name=String(saved?.name||"").trim();
  let phone=String(saved?.phone||"").trim();
  let address=String(saved?.address||"").trim();
  try{
    name=name||String(localStorage.getItem("loqataCustomerName")||"").trim();
    phone=phone||String(localStorage.getItem("loqataCustomerPhone")||"").trim();
    address=address||String(localStorage.getItem("loqataCustomerAddress")||"").trim();
  }catch{}
  return {
    name:name||String(customer?.name||"").trim(),
    phone:phone||String(customer?.phone||"").trim(),
    address:address||String(customer?.address||"").trim()
  };
}
function fillCheckoutFromSavedCustomer(){
  const saved=getSavedCustomer();
  customer={...saved};
  const nameEl=$("customerName"), phoneEl=$("customerPhone"), addressEl=$("customerAddress");
  if(nameEl) nameEl.value=saved.name||"";
  if(phoneEl) phoneEl.value=saved.phone||"";
  if(addressEl) addressEl.value=saved.address||"";
}
async function loadLoyalty(){try{loyalty=await apiRequest('/api/loyalty');}catch{loyalty={points:0,config:{pointsPerCurrency:0.1,pointValue:1,minRedeem:10}};} const p=$('loyaltyPoints');if(p)p.textContent=Number(loyalty.points||0).toLocaleString('ar-EG'); const r=$('redeemPoints');if(r){r.max=String(Math.floor(loyalty.points||0));r.value=Math.min(Number(r.value||0),Number(loyalty.points||0));} updateCheckoutSummary();}
async function loadNotifications(){const box=$("accountNotifications");if(!box)return;try{const data=await apiRequest('/api/notifications');const notes=data.items||[];box.innerHTML=notes.length?notes.map(n=>`<div class="notification-card ${n.read?'read':'unread'}"><div><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.message)}</p><small>${escapeHtml(new Date(n.createdAt).toLocaleString('ar-EG'))}</small></div>${n.read?'':'<button type="button" class="secondary-btn small-btn" data-read-notification="'+escapeHtml(n.id)+'">تمت القراءة</button>'}</div>`).join(''):'<p class="empty">لا توجد إشعارات حتى الآن.</p>';const badge=$("notificationBadge");if(badge){badge.textContent=data.unread||0;badge.hidden=!(data.unread>0);}}catch(e){box.innerHTML='<p class="empty">سجّل الدخول لعرض الإشعارات.</p>';}}
const NOTIFICATION_TYPES={customer:[['order_created','طلب جديد للعميل'],['order_status','تغيير حالة الطلب'],['shipping_update','تحديث الشحن'],['payment_update','تحديث الدفع'],['price_drop','انخفاض سعر منتج متابع'],['restock','عودة منتج للمخزون']],admin:[['new_order','طلب جديد للإدارة'],['order_status','تغيير حالة الطلب'],['shipping_update','تحديث الشحن'],['payment_update','تحديث الدفع'],['price_drop','انخفاض سعر منتج متابع'],['restock','عودة منتج للمخزون']]};
let notificationConfig={settings:null,templates:null};
async function loadNotificationSettings(){const box=$('notificationSettingsAdmin');if(!box)return;try{notificationConfig=await apiRequest('/api/admin/notification-settings');const s=notificationConfig.settings||{},t=notificationConfig.templates||{};box.innerHTML=['customer','admin'].map(role=>`<fieldset class="notification-role"><legend>${role==='customer'?'👤 إشعارات العملاء':'🛠️ إشعارات الإدارة'}</legend>${(NOTIFICATION_TYPES[role]||[]).map(([type,label])=>{const v=t[type]||{title:'',message:''};return `<div class="notification-setting-row"><label class="switch-label"><input type="checkbox" data-notify-role="${role}" data-notify-type="${type}" ${s[role]?.[type]!==false?'checked':''}> ${label}</label><input data-notify-title="${type}" value="${escapeHtml(v.title||'')}" maxlength="120" placeholder="عنوان الإشعار"><textarea data-notify-message="${type}" rows="2" maxlength="500" placeholder="نص الرسالة">${escapeHtml(v.message||'')}</textarea></div>`}).join('')}</fieldset>`).join('')}catch(e){box.innerHTML=`<p class="empty">${escapeHtml(e.message)}</p>`;}}
function notificationSettingsPayload(){const settings={customer:{},admin:{}};document.querySelectorAll('[data-notify-role]').forEach(x=>settings[x.dataset.notifyRole][x.dataset.notifyType]=x.checked);const templates={};document.querySelectorAll('[data-notify-title]').forEach(x=>{const type=x.dataset.notifyTitle;templates[type]={title:x.value.trim(),message:document.querySelector(`[data-notify-message="${type}"]`)?.value.trim()||''};});return {settings,templates};}
async function loadAdminNotifications(){const box=$("adminNotifications");if(!box)return;try{const data=await apiRequest('/api/admin/notifications');const notes=data.items||[];box.innerHTML=notes.length?notes.slice(0,30).map(n=>`<div class="notification-card ${n.read?'read':'unread'}"><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.message)}</p><small>${escapeHtml(new Date(n.createdAt).toLocaleString('ar-EG'))}</small></div>`).join(''):'<p class="empty">لا توجد إشعارات إدارية.</p>';const badge=$("adminNotificationBadge");if(badge){badge.textContent=data.unread||0;badge.hidden=!(data.unread>0);}}catch(e){box.innerHTML=`<p class="empty">${escapeHtml(e.message)}</p>`;}}
async function loadCampaigns(){try{campaigns=await apiRequest('/api/campaigns');renderCampaignBanner();}catch{campaigns=[];renderCampaignBanner();}}
function renderCampaignBanner(){const box=$("campaignBanner");if(!box)return;box.innerHTML=campaigns.length?campaigns.map(c=>`<article class="campaign-banner"><div><span class="campaign-tag">🔥 عرض</span><h2>${escapeHtml(c.title)}</h2><p>${escapeHtml(c.message)}</p>${c.endsAt?`<small>ينتهي: ${escapeHtml(new Date(c.endsAt).toLocaleString('ar-EG'))}</small>`:''}</div>${c.couponCode?`<button type="button" class="secondary-btn small-btn" data-campaign-coupon="${escapeHtml(c.couponCode)}">نسخ الكوبون ${escapeHtml(c.couponCode)}</button>`:''}</article>`).join(''):' ';}
async function loadAdminCampaigns(){try{adminCampaigns=await apiRequest('/api/admin/campaigns');renderAdminCampaigns();}catch(err){const b=$("adminCampaigns");if(b)b.innerHTML=`<p class="empty">${escapeHtml(err.message)}</p>`;}}
function renderAdminCampaigns(){const b=$("adminCampaigns");if(!b)return;b.innerHTML=adminCampaigns.length?adminCampaigns.map(c=>`<div class="admin-product-card campaign-admin-card"><div><strong>${escapeHtml(c.title)}</strong><p>${escapeHtml(c.message)}</p><small>${c.active!==false?'🟢 مفعالة':'⚪ متوقفة'}${c.startsAt?' — تبدأ '+escapeHtml(new Date(c.startsAt).toLocaleString('ar-EG')):''}${c.endsAt?' — تنتهي '+escapeHtml(new Date(c.endsAt).toLocaleString('ar-EG')):''}${c.couponCode?' — كوبون: '+escapeHtml(c.couponCode):''}</small></div><div class="admin-actions"><button type="button" data-toggle-campaign="${escapeHtml(c.id)}">${c.active!==false?'إيقاف':'تفعيل'}</button><button type="button" class="danger-btn" data-delete-campaign="${escapeHtml(c.id)}">حذف</button></div></div>`).join(''):'<p class="empty">لا توجد حملات.</p>';}
function renderAccount(){$("accountName").value=customer.name||"";$("accountPhone").value=customer.phone||"";$("accountAddress").value=customer.address||"";const mine=customer.phone?orders.filter(o=>String(o.phone||"").replace(/\D/g,"")===String(customer.phone).replace(/\D/g,"")):[];$("accountOrders").innerHTML=mine.length?`<h3>طلباتي السابقة</h3>${mine.map(o=>`<details class="order-card"><summary>#${o.id} — ${money(o.total)} — ${escapeHtml(o.status||"جديد")}</summary><p>${escapeHtml(o.date||"")}<br>${(o.items||[]).map(i=>`${escapeHtml(i.name)} × ${i.qty}`).join("<br>")}</p><button type="button" class="secondary-btn small-btn" data-track-order="${escapeHtml(o.id)}">🚚 تتبع الشحنة</button></details>`).join("")}`:`<p class="empty">لا توجد طلبات محفوظة لهذا الرقم.</p>`;}
function openAccount(){renderAccount();loadNotifications();$("accountModal").hidden=false;$("accountOverlay").classList.remove("hidden");document.body.classList.add("modal-open");}
function closeAccount(){$("accountModal").hidden=true;$("accountOverlay").classList.add("hidden");document.body.classList.remove("modal-open");}
const categoryNames = {electronics:"إلكترونيات",fashion:"ملابس",home:"المنزل"};
function cartCount(){return cart.reduce((sum,item)=>sum+Math.max(0,Number(item.qty)||0),0);}
function cartTotal(){return cart.reduce((sum,item)=>sum+(Math.max(0,Number(item.qty)||0)*Math.max(0,Number(item.price)||0)),0);}
function saveCart(){localStorage.setItem("loqataCart",JSON.stringify(cart));}
function saveProducts(){localStorage.setItem("loqataProducts",JSON.stringify(products));}
function saveOrders(){localStorage.setItem("loqataOrders",JSON.stringify(orders));}
function saveFavorites(){localStorage.setItem("loqataFavorites",JSON.stringify(favorites));}
async function toggleFavorite(id){const adding=!favorites.includes(id);favorites=adding?[...favorites,id]:favorites.filter(x=>x!==id);saveFavorites();renderProducts();loadRecommendations();if(authenticatedUser){try{await apiRequest("/api/wishlist/toggle",{method:"POST",body:JSON.stringify({productId:id})});toast(adding?"تمت المتابعة — سنبلغك عند انخفاض السعر أو عودة المخزون":"تم إلغاء متابعة المنتج");}catch(e){toast(e.message);}}else toast(adding?"أضيف للمفضلة":"أزيل من المفضلة");}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),1800);}
function effectiveProductPriceForFilter(p){const now=Date.now();const sale=Number(p.salePrice);return Number.isFinite(sale)&&sale>0&&sale<Number(p.price||0)&&(!p.offerEndsAt||new Date(p.offerEndsAt).getTime()>now)?sale:Number(p.price||0);}
function effectivePrice(p){return effectiveProductPriceForFilter(p);}
function isOnOffer(p){return effectiveProductPriceForFilter(p)<Number(p.price||0);}
async function loadRecommendations(){
  const box=$("recommendations"); if(!box)return;
  try{
    const data=await apiRequest('/api/recommendations');
    const items=data.items||[];
    const hint=$("recommendationHint"); if(hint)hint.textContent=data.personalized?`مبنية على ${data.basedOn||'نشاطك'}`:'اختيارات مقترحة لك';
    box.innerHTML=items.length?items.map(p=>`<article class="recommendation-card">${visualMarkup(p,'recommendation-img')}<div class="recommendation-body"><h3>${escapeHtml(p.name)}</h3>${priceMarkup(p)}<div class="rating-inline"><span class="stars">${ratingStars(p.ratingAverage)}</span><small>${p.ratingCount||0} تقييم</small></div>${isOnOffer(p)?'<span class="smart-offer-badge">⚡ عرض خاص</span>':''}<div class="recommendation-actions"><button class="secondary-btn small-btn" data-details="${p.id}" type="button">التفاصيل</button><button class="add-btn small-btn" data-add="${p.id}" type="button" onclick="event.stopPropagation();addToCart(Number(this.dataset.add));return false;">أضف للسلة</button></div></div></article>`).join(''):'<p class="empty">سنضيف لك مقترحات جديدة قريبًا.</p>';
  }catch(e){const items=products.slice(0,4); box.innerHTML=items.map(p=>`<article class="recommendation-card">${visualMarkup(p,'recommendation-img')}<div class="recommendation-body"><h3>${escapeHtml(p.name)}</h3>${priceMarkup(p)}<div class="recommendation-actions"><button class="secondary-btn small-btn" data-details="${p.id}" type="button">التفاصيل</button><button class="add-btn small-btn" data-add="${p.id}" type="button" onclick="event.stopPropagation();addToCart(Number(this.dataset.add));return false;">أضف للسلة</button></div></div></article>`).join('');}
}

function renderProducts(){
  const q=$("searchInput").value.trim().toLowerCase();
  const min=Number(minPriceFilter||0), max=maxPriceFilter===""?Infinity:Number(maxPriceFilter);
  let filtered=products.filter(p=>{
    const text=`${p.name||""} ${p.description||""}`.toLowerCase();
    const price=effectiveProductPriceForFilter(p);
    const rating=Number(p.ratingAverage||0);
    const stock=Number(p.stock??0);
    return (currentCategory==="all"||p.category===currentCategory) && (!favoritesOnly||favorites.includes(p.id)) && (!q||text.includes(q)) && price>=min && price<=max && rating>=Number(ratingFilter||0) && (offerFilter==="all"||(offerFilter==="offers"&&isOnOffer(p))||(offerFilter==="available"&&stock>0));
  });
  const sorters={
    priceAsc:(a,b)=>effectiveProductPriceForFilter(a)-effectiveProductPriceForFilter(b),
    priceDesc:(a,b)=>effectiveProductPriceForFilter(b)-effectiveProductPriceForFilter(a),
    ratingDesc:(a,b)=>Number(b.ratingAverage||0)-Number(a.ratingAverage||0),
    newest:(a,b)=>Number(b.id||0)-Number(a.id||0),
    nameAsc:(a,b)=>String(a.name||"").localeCompare(String(b.name||""),'ar')
  };
  if(sorters[sortFilter]) filtered=filtered.slice().sort(sorters[sortFilter]);
  $("products").innerHTML=filtered.map(p=>`<article class="card">${visualMarkup(p)}<button class="favorite-btn ${favorites.includes(p.id)?"is-favorite":""}" data-favorite="${p.id}" type="button" aria-label="المفضلة">${favorites.includes(p.id)?"♥":"♡"}</button><div class="card-body"><h3>${escapeHtml(p.name)}</h3>${priceMarkup(p)}<div class="rating-inline"><span class="stars">${ratingStars(p.ratingAverage)}</span><small>${p.ratingCount||0} تقييم</small></div>${isOnOffer(p)?`<span class="smart-offer-badge">⚡ عرض خاص</span>`:""}<div class="stock-line">${Number(p.stock ?? 0)>0?`متاح: ${Number(p.stock)} قطعة`:`غير متوفر حاليًا`}</div><button class="details-btn" data-details="${p.id}" type="button">عرض التفاصيل</button><button class="add-btn" data-add="${p.id}" type="button" onclick="event.stopPropagation();addToCart(Number(this.dataset.add));return false;" ${Number(p.stock ?? 0)<=0?"disabled":""}>${Number(p.stock ?? 0)<=0?"غير متوفر":"أضف للسلة"}</button></div></article>`).join("");
  $("resultCount").textContent=`${filtered.length} منتج`;$("emptyState").classList.toggle("hidden",filtered.length!==0);
}

function renderCart(){$("cartCount").textContent=cartCount();$("cartTotal").textContent=money(cartTotal());$("cartItems").innerHTML=cart.length?cart.map(i=>`<div class="cart-item">${visualMarkup(i,"cart-emoji")}<div class="cart-info"><strong>${escapeHtml(i.name)}</strong><div>${money(i.price)}</div><div class="qty"><button type="button" data-minus="${i.id}">−</button><span>${i.qty}</span><button type="button" data-plus="${i.id}">+</button><button class="remove" type="button" data-remove="${i.id}">حذف</button></div></div></div>`).join(""):`<div class="empty">السلة فارغة حاليًا.</div>`;}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;const item=cart.find(x=>x.id===id);const nextQty=(item?.qty||0)+1;if(Number(p.stock ?? 0)<nextQty)return toast("الكمية المطلوبة غير متاحة");if(item){item.price=effectivePrice(p);item.qty++;}else cart.push({...p,price:effectivePrice(p),qty:1});saveCart();renderCart();toast("تمت إضافة المنتج للسلة");}
function changeQty(id,delta){const item=cart.find(x=>x.id===id);if(!item)return;item.qty+=delta;if(item.qty<=0)cart=cart.filter(x=>x.id!==id);saveCart();renderCart();}
function openCart(){const stored=readJson("loqataCart",cart);if(Array.isArray(stored))cart=stored;renderCart();$("cartPanel").classList.add("open");$("cartOverlay").classList.remove("hidden");}
function closeCart(){$("cartPanel").classList.remove("open");$("cartOverlay").classList.add("hidden");}
function ratingStars(value){const n=Math.max(0,Math.min(5,Math.round(Number(value)||0)));return '★'.repeat(n)+'☆'.repeat(5-n);}
async function loadProductReviews(productId){const box=$("productReviews");if(!box)return;try{const d=await apiRequest(`/api/products/${productId}/reviews`);const q=await apiRequest(`/api/products/${productId}/questions`);box.innerHTML=`<div class="review-summary"><strong>${d.average||0}/5</strong><span class="stars">${ratingStars(d.average)}</span><small>(${d.count||0} تقييم)</small></div>${(d.items||[]).map(r=>`<article class="review-card ${r.own&&r.status!=='approved'?'review-pending':''}"><div><strong>${escapeHtml(r.customerName||'عميل')}</strong><span class="stars">${ratingStars(r.rating)}</span></div><p>${escapeHtml(r.text||'تقييم بدون تعليق')}</p><small>${r.status==='approved'?'منشور':r.status==='pending'?'قيد المراجعة':'مرفوض'}</small></article>`).join('')||'<p class="empty">لا توجد تقييمات منشورة بعد.</p>'}<div class="review-form-wrap"><h4>⭐ اكتب تقييمك</h4>${authenticatedUser?`<form id="reviewForm" class="review-form"><select id="reviewRating" required><option value="">اختر التقييم</option><option value="5">★★★★★ ممتاز</option><option value="4">★★★★ جيد جدًا</option><option value="3">★★★ جيد</option><option value="2">★★ يحتاج تحسين</option><option value="1">★ ضعيف</option></select><textarea id="reviewText" rows="3" maxlength="500" placeholder="اكتب تعليقك (اختياري)"></textarea><button class="primary-btn" type="submit">إرسال التقييم</button></form>`:'<p class="checkout-note">سجّل الدخول ثم أتمم طلبًا مكتملًا يحتوي على هذا المنتج لتتمكن من تقييمه.</p>'}</div><section class="questions-section"><h4>💬 أسئلة وأجوبة المنتج</h4>${(q.items||[]).map(x=>`<article class="question-card"><p><strong>❓ ${escapeHtml(x.customerName||'عميل')}:</strong> ${escapeHtml(x.text)}</p>${x.status==='answered'?`<p class="question-answer"><strong>💬 لقطة:</strong> ${escapeHtml(x.answer)}</p>`:`<small>قيد انتظار إجابة الإدارة</small>`}</article>`).join('')||'<p class="empty">لا توجد أسئلة بعد.</p>'}${authenticatedUser?`<form id="questionForm" class="question-form"><textarea id="questionText" rows="3" maxlength="500" required placeholder="اسأل عن المقاس أو المواصفات أو الشحن..."></textarea><button class="secondary-btn" type="submit">إرسال السؤال</button></form>`:'<p class="checkout-note">سجّل الدخول لطرح سؤال عن المنتج.</p>'}</section>`;const form=$("reviewForm");if(form)form.addEventListener('submit',async e=>{e.preventDefault();try{await apiRequest('/api/reviews',{method:'POST',body:JSON.stringify({productId,rating:Number($("reviewRating").value),text:$("reviewText").value.trim()})});toast('تم إرسال تقييمك للمراجعة');loadProductReviews(productId);}catch(err){toast(err.message);}});const qform=$("questionForm");if(qform)qform.addEventListener('submit',async e=>{e.preventDefault();try{await apiRequest('/api/questions',{method:'POST',body:JSON.stringify({productId,text:$("questionText").value.trim()})});toast('تم إرسال سؤالك للإدارة');loadProductReviews(productId);}catch(err){toast(err.message);}});}catch(e){box.innerHTML=`<p class="empty">${escapeHtml(e.message)}</p>`;}}
async function loadSimilarProducts(productId){const box=$("similarProducts");if(!box)return;try{const d=await apiRequest(`/api/products/${productId}/recommendations`);const items=d.items||[];box.innerHTML=items.length?items.map(x=>`<article class="similar-card">${visualMarkup(x,'similar-img')}<div><strong>${escapeHtml(x.name)}</strong>${priceMarkup(x)}<div class="rating-inline"><span class="stars">${ratingStars(x.ratingAverage)}</span><small>${x.ratingCount||0}</small></div><div class="similar-actions"><button class="secondary-btn small-btn" data-details="${x.id}" type="button">التفاصيل</button><button class="add-btn small-btn" data-add="${x.id}" type="button" onclick="event.stopPropagation();addToCart(Number(this.dataset.add));return false;">أضف</button></div></div></article>`).join(''):'<p class="empty">لا توجد منتجات مشابهة متاحة حاليًا.</p>';}catch(e){box.innerHTML='<p class="empty">تعذر تحميل المنتجات المشابهة.</p>';}}
function openProductDetails(id){const p=products.find(x=>x.id===id);if(!p)return;const stock=Math.max(0,Number(p.stock??0));$("productDetails").innerHTML=`${visualMarkup(p,"detail-emoji")}<div class="detail-content"><h3>${escapeHtml(p.name)}</h3><div class="detail-price">${priceMarkup(p)}</div><div class="rating-inline"><span class="stars">${ratingStars(p.ratingAverage)}</span><strong>${p.ratingAverage||0}</strong><small>(${p.ratingCount||0} تقييم)</small></div><div class="stock-line">${stock>0?`المتاح: ${stock} قطعة`:`غير متوفر حاليًا`}</div><p>${escapeHtml(p.description||"منتج مختار من متجر لقطة.")}</p><div class="detail-buy"><label>الكمية<select id="detailQty" ${stock<=0?'disabled':''}>${Array.from({length:Math.min(stock,10)},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><button class="primary-btn" data-detail-add="${p.id}" type="button" onclick="event.stopPropagation();const q=Math.max(1,Number(document.getElementById('detailQty')?.value||1));for(let i=0;i<q;i++)addToCart(Number(this.dataset.detailAdd));closeProductDetails();return false;" ${stock<=0?'disabled':''}>${stock<=0?'غير متوفر':'🛒 أضف للسلة'}</button><button class="secondary-btn" data-detail-buy="${p.id}" type="button" onclick="event.stopPropagation();const q=Math.max(1,Number(document.getElementById('detailQty')?.value||1));for(let i=0;i<q;i++)addToCart(Number(this.dataset.detailBuy));closeProductDetails();openCart();return false;" ${stock<=0?'disabled':''}>اشترِ الآن</button></div><section class="similar-section"><h4>✨ منتجات مشابهة</h4><div id="similarProducts" class="similar-products"><p class="empty">جارٍ التحميل...</p></div></section><section class="reviews-section"><h4>⭐ تقييمات العملاء</h4><div id="productReviews"><p class="empty">جارٍ تحميل التقييمات...</p></div></section></div>`;$('productModal').hidden=false;$("productOverlay").classList.remove("hidden");document.body.classList.add("modal-open");loadProductReviews(id);loadSimilarProducts(id);}
function closeProductDetails(){$("productModal").hidden=true;$("productOverlay").classList.add("hidden");document.body.classList.remove("modal-open");}
function populateShippingZones(){const sel=$("shippingZone");if(!sel)return;const zones=Array.isArray(shippingSettings.zones)&&shippingSettings.zones.length?shippingSettings.zones:DEFAULT_SHIPPING_SETTINGS.zones;sel.innerHTML=`<option value="">اختر منطقة التوصيل</option>`+zones.map(z=>`<option value="${escapeHtml(z.id)}">${escapeHtml(z.name)} — ${money(z.fee)}</option>`).join("");}
async function loadShippingSettings(){shippingSettings=JSON.parse(JSON.stringify(DEFAULT_SHIPPING_SETTINGS));populateShippingZones();try{const remote=await apiRequest("/api/shipping-settings");if(remote&&Array.isArray(remote.zones)&&remote.zones.length){shippingSettings=remote;populateShippingZones();}}catch(e){/* Local shipping zones remain available when backend is offline. */}}
function checkoutSubtotal(){return cart.reduce((s,i)=>s+i.qty*Number(i.price||0),0);}
async function getCheckoutQuote(){if(!cart.length)return null;const data=await apiRequest('/api/checkout/quote',{method:'POST',body:JSON.stringify({items:cart.map(i=>({id:i.id,qty:i.qty})),couponCode:selectedCoupon?.code||$("couponCode")?.value.trim().toUpperCase()||"",shippingZone:$("shippingZone")?.value||""})});return data;}
async function updateCheckoutSummary(){const box=$("checkoutSummary");if(!box)return;box.innerHTML='<strong>ملخص الطلب</strong><p class="empty">جارٍ تحديث الأسعار والعروض...</p>';try{const q=await getCheckoutQuote();if(!q)return; if(q.appliedCampaign&&!selectedCoupon){selectedCoupon={code:q.couponCode,discount:q.discount,label:q.couponLabel,auto:true};$("couponCode").value=q.couponCode||"";$("couponMessage").textContent=`تم تطبيق العرض تلقائيًا: ${q.couponLabel||"خصم"}`;}const discount=Number(q.discount||0);const requested=Math.max(0,Math.floor(Number($("redeemPoints")?.value||0)));const available=Math.floor(Number(loyalty.points||0));const pointsUsed=Math.min(requested,available);const loyaltyDiscount=Math.min(Math.max(0,Number(q.subtotal||0)-discount),pointsUsed*Number(loyalty.config?.pointValue||1));const total=Math.max(0,Number(q.total||0)-loyaltyDiscount);box.innerHTML=`<strong>ملخص الطلب</strong>${q.items.map(i=>`<div>${escapeHtml(i.name)} × ${i.qty} — ${i.originalPrice>i.price?`<s>${money(i.originalPrice*i.qty)}</s> `:""}${money(i.price*i.qty)}</div>`).join("")}<hr><div>الإجمالي قبل الخصم: ${money(q.subtotal)}</div><div>خصم العرض/الكوبون: -${money(discount)}</div>${pointsUsed?`<div>خصم نقاط الولاء (${pointsUsed} نقطة): -${money(loyaltyDiscount)}</div>`:""}<div>الشحن: ${q.shippingFee===0?"مجاني 🎉":money(q.shippingFee)}</div><strong>الإجمالي النهائي: ${money(total)}</strong>`;}catch(err){const subtotal=cart.reduce((sum,i)=>sum+effectivePrice(i)*Number(i.qty||0),0);const zone=(shippingSettings.zones||DEFAULT_SHIPPING_SETTINGS.zones).find(z=>String(z.id)===String($("shippingZone")?.value||""));const shippingFee=zone?(subtotal>=Number(shippingSettings.freeShippingThreshold||1000)?0:Number(zone.fee||0)):0;box.innerHTML=`<strong>ملخص الطلب</strong>${cart.map(i=>`<div>${escapeHtml(i.name)} × ${i.qty} — ${money(effectivePrice(i)*i.qty)}</div>`).join("")}<hr><div>الإجمالي قبل الخصم: ${money(subtotal)}</div><div>الشحن: ${zone?(shippingFee===0?"مجاني 🎉":money(shippingFee)):"اختر منطقة التوصيل"}</div><strong>الإجمالي النهائي: ${money(subtotal+shippingFee)}</strong>`;}}
async function openCheckout(){const storedCart=readJson("loqataCart",cart);if(Array.isArray(storedCart))cart=storedCart;renderCart();const storedCustomer=readJson("loqataCustomer",customer);if(storedCustomer&&typeof storedCustomer==="object")customer={...customer,...storedCustomer};if(!cart.length)return toast("أضف منتجًا إلى السلة أولًا");await loadShippingSettings();selectedCoupon=null;$("couponCode").value="";if($("redeemPoints"))$("redeemPoints").value=0;loadLoyalty();$("couponMessage").textContent="";fillCheckoutFromSavedCustomer();updateCheckoutSummary();$("checkoutModal").hidden=false;$("checkoutOverlay").classList.remove("hidden");document.body.classList.add("modal-open");}
function closeCheckout(){$("checkoutModal").hidden=true;$("checkoutOverlay").classList.add("hidden");document.body.classList.remove("modal-open");}
async function sendOrder(name,phone,address,couponCode="",verificationToken="",pointsToRedeem=0){customer={name,phone,address};saveCustomer();const paymentMethod=otpState.paymentMethod||"cod";if(paymentMethod==="card"&&!authenticatedUser){toast("سجّل الدخول أولًا لاستخدام الدفع الإلكتروني");showAuth();return;}const order={name,phone,address,shippingZone:$('shippingZone').value,paymentMethod,items:cart.map(i=>({id:i.id,qty:i.qty})),couponCode,verificationToken,pointsToRedeem:Number(pointsToRedeem||0)};try{const saved=await apiRequest('/api/orders',{method:'POST',body:JSON.stringify(order)});orders.unshift(saved);saveOrders();const fresh=await apiRequest('/api/products');if(Array.isArray(fresh)){products=fresh;saveProducts();}if(paymentMethod==='card'){const intent=await apiRequest('/api/payments/intents',{method:'POST',body:JSON.stringify({paymentMethod:'card',orderId:saved.id,amount:saved.total,billingData:{name,phone,address},items:saved.items||[]})});cart=[];saveCart();renderProducts();renderCart();closeCheckout();if(intent.provider==='demo'){openDemoPayment(saved);}else if(intent.checkoutUrl){window.location.href=intent.checkoutUrl;}return;}const lines=(saved.items||[]).map(i=>`- ${i.name} × ${i.qty} = ${money(i.qty*i.price)}`);const message=`مرحبًا، أريد تأكيد طلبي من متجر لقطة:

الاسم: ${name}
الهاتف: ${phone}
العنوان: ${address}
منطقة التوصيل: ${saved.shippingZoneName||''}
طريقة الدفع: الدفع عند الاستلام

المنتجات:
${lines.join("\n")}

الإجمالي قبل الخصم: ${money(saved.subtotal)}
الخصم: -${money(saved.discount)}
الشحن: ${saved.shippingFee===0?'مجاني':money(saved.shippingFee)}
الإجمالي النهائي: ${money(saved.total)}`;cart=[];saveCart();renderProducts();renderCart();toast('تم حفظ الطلب — جارٍ فتح واتساب');closeCheckout();window.location.href=`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;return;}catch(err){toast(err.message);}}
function openDemoPayment(order){window.__demoOrder=order;$("paymentDemoText").textContent=`طلب #${order.id} — ${money(order.total)}. هذه محاكاة فقط.`;$("paymentDemoModal").hidden=false;$("paymentDemoOverlay").classList.remove('hidden');document.body.classList.add('modal-open');}
async function completeDemoPayment(success){try{const r=await apiRequest('/api/payments/demo/complete',{method:'POST',body:JSON.stringify({orderId:window.__demoOrder.id,success})});orders=orders.map(o=>o.id===r.order.id?r.order:o);saveOrders();$("paymentDemoModal").hidden=true;$("paymentDemoOverlay").classList.add('hidden');document.body.classList.remove('modal-open');toast(success?'تمت محاكاة الدفع بنجاح — الطلب قيد التجهيز':'تمت محاكاة فشل الدفع — الطلب ملغي');}catch(err){toast(err.message);}}

function closeSettingsMenu(){$("settingsMenu").hidden=true;$('menuBtn').setAttribute('aria-expanded','false');}
function toggleSettingsMenu(){const menu=$("settingsMenu");menu.hidden=!menu.hidden;$("menuBtn").setAttribute('aria-expanded',String(!menu.hidden));}
function handleSetting(action){closeSettingsMenu();if(action==="home")window.scrollTo({top:0,behavior:"smooth"});else if(action==="clear-cart"){cart=[];saveCart();renderCart();toast("تم تفريغ السلة");}else if(action==="about")toast("لقطة — متجر إلكتروني لمنتجات مختارة");else if(action==="contact")window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("مرحبًا، أريد التواصل مع متجر لقطة")}`,"_blank");else if(action==="account")openAccount();else if(action==="admin")openAdmin();}
function renderInsights(){
  const lowStock=products.filter(p=>Number(p.stock??0)<=5);
  const revenue=orders.reduce((s,o)=>s+Number(o.total||0),0);
  const completed=orders.filter(o=>o.status==="مكتمل").length;
  const pending=orders.filter(o=>o.status!=="مكتمل"&&o.status!=="ملغي").length;
  const sold={};
  orders.forEach(o=>(o.items||[]).forEach(i=>sold[i.name]=(sold[i.name]||0)+Number(i.qty||0)));
  const top=Object.entries(sold).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topHtml=top.length?top.map(([name,count])=>`<div class="top-product"><span>${escapeHtml(name)}</span><b>${count} قطعة</b></div>`).join(""):"<p class=\"admin-note\">ستظهر المنتجات الأكثر طلبًا بعد تسجيل الطلبات.</p>";
  $("adminInsights").innerHTML=`<div class="insight-grid"><div class="insight-card"><span>المبيعات المسجلة</span><strong>${money(revenue)}</strong></div><div class="insight-card"><span>طلبات مكتملة</span><strong>${completed}</strong></div><div class="insight-card"><span>طلبات قيد المتابعة</span><strong>${pending}</strong></div><div class="insight-card"><span>منتجات منخفضة المخزون</span><strong>${lowStock.length}</strong></div></div><div class="top-products"><h4>الأكثر طلبًا</h4>${topHtml}</div>`;
}
async function loadAdminReviews(){const box=$("adminReviews");if(!box)return;try{const reviews=await apiRequest('/api/admin/reviews');box.innerHTML=reviews.length?reviews.map(r=>`<div class="admin-product-card review-admin-card"><div><strong>${escapeHtml(r.productName)}</strong> — <span class="stars">${ratingStars(r.rating)}</span><p>${escapeHtml(r.text||'بدون تعليق')}</p><small>العميل: ${escapeHtml(r.customerName||'')} | الطلب: #${escapeHtml(r.orderId)} | ${new Date(r.createdAt).toLocaleString('ar-EG')} | الحالة: ${r.status==='approved'?'منشور':r.status==='rejected'?'مرفوض':'قيد المراجعة'}</small></div><div class="admin-actions"><button type="button" data-review-status="approved" data-review-id="${escapeHtml(r.id)}">نشر</button><button type="button" data-review-status="rejected" data-review-id="${escapeHtml(r.id)}">رفض</button><button type="button" class="danger-btn" data-delete-review="${escapeHtml(r.id)}">حذف</button></div></div>`).join(''):'<p class="empty">لا توجد تقييمات.</p>';}catch(e){box.innerHTML=`<p class="empty">${escapeHtml(e.message)}</p>`;}}
async function loadAdminQuestions(){const box=$("adminQuestions");if(!box)return;try{const qs=await apiRequest('/api/admin/questions');box.innerHTML=qs.length?qs.map(q=>`<div class="admin-product-card question-admin-card"><div><strong>${escapeHtml(q.productName)}</strong><p>❓ ${escapeHtml(q.text)}</p>${q.answer?`<p>💬 <strong>الإجابة:</strong> ${escapeHtml(q.answer)}</p>`:''}<small>العميل: ${escapeHtml(q.customerName||'')} | ${new Date(q.createdAt).toLocaleString('ar-EG')} | الحالة: ${q.status==='answered'?'تمت الإجابة':q.status==='hidden'?'مخفي':'قيد الانتظار'}</small></div><div class="admin-actions"><textarea rows="2" data-question-answer="${escapeHtml(q.id)}" placeholder="اكتب الإجابة هنا">${escapeHtml(q.answer||'')}</textarea><button type="button" data-answer-question="${escapeHtml(q.id)}">${q.answer?'تحديث الإجابة':'إرسال الإجابة'}</button><button type="button" data-question-status="hidden" data-question-id="${escapeHtml(q.id)}">إخفاء</button><button type="button" class="danger-btn" data-delete-question="${escapeHtml(q.id)}">حذف</button></div></div>`).join(''):'<p class="empty">لا توجد أسئلة.</p>';}catch(e){box.innerHTML=`<p class="empty">${escapeHtml(e.message)}</p>`;}}
function renderAdmin(){loadAdminCoupons();loadAdminShipping();loadAdminNotifications();loadNotificationSettings();loadAdminCampaigns();loadAdminLoyalty();loadAdminReviews();loadAdminQuestions();const revenue=orders.reduce((s,o)=>s+Number(o.total||0),0);$("adminStats").innerHTML=`<div>عدد المنتجات: <strong>${products.length}</strong></div><div>عدد الطلبات: <strong>${orders.length}</strong></div><div>إجمالي الطلبات: <strong>${money(revenue)}</strong></div><div>طلبات جديدة: <strong>${orders.filter(o=>o.status==="جديد").length}</strong></div>`;renderInsights();$("adminProducts").innerHTML=products.map(p=>`<div class="admin-product-card"><div class="admin-product-grid"><div class="admin-product-preview">${visualMarkup(p,"admin-product-image")}<strong>${escapeHtml(p.name)}</strong></div><label>الاسم<input data-field="name" data-product-id="${p.id}" value="${escapeHtml(p.name)}"></label><label>السعر الأصلي<input type="number" min="0" data-field="price" data-product-id="${p.id}" value="${p.price}"></label><label>سعر العرض<input type="number" min="0" data-field="salePrice" data-product-id="${p.id}" value="${p.salePrice||''}" placeholder="اختياري"></label><label>نهاية العرض<input type="datetime-local" data-field="offerEndsAt" data-product-id="${p.id}" value="${p.offerEndsAt?String(p.offerEndsAt).slice(0,16):''}"></label><label>المخزون<input type="number" min="0" data-field="stock" data-product-id="${p.id}" value="${Number(p.stock??0)}"></label><label>القسم<select data-field="category" data-product-id="${p.id}"><option value="electronics" ${p.category==='electronics'?'selected':''}>إلكترونيات</option><option value="fashion" ${p.category==='fashion'?'selected':''}>ملابس</option><option value="home" ${p.category==='home'?'selected':''}>المنزل</option></select></label><label>الإيموجي<input data-field="emoji" data-product-id="${p.id}" value="${escapeHtml(p.emoji||'🛍️')}"></label><label class="wide-field">رابط الصورة<input type="url" data-field="image" data-product-id="${p.id}" value="${escapeHtml(p.image||'')}" placeholder="https://..."></label><label class="wide-field">الوصف<textarea data-field="description" data-product-id="${p.id}" rows="2">${escapeHtml(p.description||'')}</textarea></label></div><div class="admin-actions"><button type="button" data-save-product="${p.id}">حفظ التعديلات</button><button type="button" class="danger-btn" data-delete-product="${p.id}">حذف المنتج</button></div></div>`).join("");$("adminCoupons").innerHTML=adminCoupons.length?adminCoupons.map(c=>`<div class="admin-product-card"><strong>${escapeHtml(c.code)}</strong> — ${c.type==='percent'?c.value+'%':money(c.value)}<p>${escapeHtml(c.label||'خصم')} | الحد الأدنى: ${money(c.minSubtotal||0)} | الانتهاء: ${escapeHtml(c.expiresAt||'بدون')}</p><button type="button" class="danger-btn" data-delete-coupon="${c.id}">حذف الكوبون</button></div>`).join(""):`<p class="empty">لا توجد كوبونات.</p>`;const filter=$("orderStatusFilter")?.value||"all";const visible=orders.filter(o=>(filter==="all"||o.status===filter)&&(!adminOrderQuery||`${o.id} ${o.name} ${o.phone}`.toLowerCase().includes(adminOrderQuery)));$("adminOrders").innerHTML=visible.length?visible.map(o=>`<details class="order-card"><summary>#${o.id} — ${escapeHtml(o.name)} — ${money(o.total)} — <span class="status-pill status-${o.status==='جديد'?'new':o.status==='مكتمل'?'done':o.status==='ملغي'?'cancelled':'progress'}">${escapeHtml(o.status||'جديد')}</span></summary><p>الهاتف: ${escapeHtml(o.phone)}<br>العنوان: ${escapeHtml(o.address)}<br>التاريخ: ${escapeHtml(o.date)}</p><div>${(o.items||[]).map(i=>`<div>${escapeHtml(i.name)} × ${i.qty} — ${money(i.qty*i.price)}</div>`).join("")}</div><label class="order-status-editor">حالة الطلب<select data-order-status-select="${o.id}"><option ${o.status==='جديد'?'selected':''}>جديد</option><option ${o.status==='قيد التجهيز'?'selected':''}>قيد التجهيز</option><option ${o.status==='تم الشحن'?'selected':''}>تم الشحن</option><option ${o.status==='مكتمل'?'selected':''}>مكتمل</option><option ${o.status==='ملغي'?'selected':''}>ملغي</option></select></label><button type="button" class="danger-btn" data-delete-order="${o.id}">حذف الطلب</button></details>`).join(""):`<p class="empty">لا توجد طلبات بهذه الحالة.</p>`;}
async function openAdmin(){
  // After an explicit admin logout, never trust a stale cross-origin cookie to reopen
  // the dashboard. A successful admin login clears this marker.
  if(localStorage.getItem("loqataAdminLoggedOut")==="1"){
    $("adminEmail").value="";$("adminPassword").value="";$("adminLoginMessage").textContent="";$("adminBootstrapBtn").dataset.mode="login";$("adminLoginTitle").textContent="🔐 دخول الإدارة";$("adminLoginForm")?.querySelector("button[type=submit]") && ($("adminLoginForm").querySelector("button[type=submit]").textContent="دخول الإدارة");$("adminBootstrapBtn").textContent="إنشاء حساب المدير لأول مرة";$("adminLoginModal").hidden=false;$("adminOverlay").classList.remove("hidden");document.body.classList.add("modal-open");return;
  }
  try{
    const me=await apiRequest('/api/auth/me');
    if(me.user?.role==='admin'){adminUser=me.user;adminUnlocked=true;renderAdmin();$("adminModal").hidden=false;$("adminOverlay").classList.remove("hidden");document.body.classList.add("modal-open");return;}
  }catch{}
  $("adminEmail").value="";$("adminPassword").value="";$("adminLoginMessage").textContent="";$("adminBootstrapBtn").dataset.mode="login";$("adminLoginTitle").textContent="🔐 دخول الإدارة";$("adminLoginForm")?.querySelector("button[type=submit]") && ($("adminLoginForm").querySelector("button[type=submit]").textContent="دخول الإدارة");$("adminBootstrapBtn").textContent="إنشاء حساب المدير لأول مرة";$("adminLoginModal").hidden=false;$("adminOverlay").classList.remove("hidden");document.body.classList.add("modal-open");
}
function closeAdminLogin(){$("adminLoginModal").hidden=true;if($("adminModal").hidden)$("adminOverlay").classList.add("hidden");document.body.classList.remove("modal-open");}
function closeAdmin(){$("adminModal").hidden=true;$("adminOverlay").classList.add("hidden");document.body.classList.remove("modal-open");}
function logoutAdmin(event){
  // v5.19.9: close the admin UI FIRST. Nothing before these lines may throw or wait.
  try{event?.preventDefault();event?.stopPropagation();}catch{}
  const modal=document.getElementById("adminModal");
  const loginModal=document.getElementById("adminLoginModal");
  const detailsModal=document.getElementById("adminOrderDetailsModal");
  const overlay=document.getElementById("adminOverlay");
  if(modal){modal.hidden=true;modal.style.display="none";}
  if(loginModal){loginModal.hidden=true;loginModal.style.display="none";}
  if(detailsModal){detailsModal.hidden=true;detailsModal.style.display="none";}
  if(overlay){overlay.classList.add("hidden");overlay.style.display="none";}
  document.body.classList.remove("modal-open");

  // Clear all client-side admin state independently so one failure cannot block logout.
  try{adminUser=null;}catch{}
  try{adminUnlocked=false;}catch{}
  try{authenticatedUser=null;}catch{}
  try{adminOrderDetailsId=null;}catch{}
  try{localStorage.setItem("loqataAdminLoggedOut","1");}catch{}

  const btn=document.getElementById("adminLogoutBtn");
  if(btn){btn.disabled=false;btn.textContent="🚪 تسجيل خروج المدير";}
  try{toast("تم تسجيل خروج المدير");}catch{}

  // Invalidate the HttpOnly server session without ever blocking the interface.
  // keepalive lets the request continue even if the page is closed/refreshed.
  try{
    fetch(apiUrl('/api/auth/logout'),{
      method:'POST',
      credentials:'include',
      keepalive:true,
      cache:'no-store',
      headers:{'Accept':'application/json'}
    }).catch(()=>{});
  }catch{}
}

$("adminLogoutBtn")?.addEventListener("click",logoutAdmin);

$("closeAccount")?.addEventListener("click",closeAccount);$("accountOverlay")?.addEventListener("click",closeAccount);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-read-notification]');if(b){try{await apiRequest('/api/notifications/read',{method:'POST',body:JSON.stringify({id:b.dataset.readNotification})});loadNotifications();}catch(err){toast(err.message);}}const all=e.target.closest('[data-read-all-notifications]');if(all){try{await apiRequest('/api/notifications/read-all',{method:'POST'});loadNotifications();toast('تم تعليم الإشعارات كمقروءة');}catch(err){toast(err.message);}}const adminAll=e.target.closest('[data-admin-read-all-notifications]');if(adminAll){try{await apiRequest('/api/admin/notifications/read-all',{method:'POST'});loadAdminNotifications();toast('تم تعليم الإشعارات الإدارية كمقروءة');}catch(err){toast(err.message);}}});
document.addEventListener('click',e=>{const a=e.target.closest('[data-answer-question]');if(a){const id=a.dataset.answerQuestion;const ta=document.querySelector(`[data-question-answer="${CSS.escape(id)}"]`);apiRequest(`/api/admin/questions/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({answer:ta?.value||''})}).then(()=>{loadAdminQuestions();loadAdminNotifications();toast('تم حفظ إجابة السؤال');}).catch(err=>toast(err.message));return;}const st=e.target.closest('[data-question-status]');if(st){apiRequest(`/api/admin/questions/${encodeURIComponent(st.dataset.questionId)}`,{method:'PATCH',body:JSON.stringify({status:st.dataset.questionStatus})}).then(()=>{loadAdminQuestions();toast('تم تحديث حالة السؤال');}).catch(err=>toast(err.message));return;}const d=e.target.closest('[data-delete-question]');if(d){apiRequest(`/api/admin/questions/${encodeURIComponent(d.dataset.deleteQuestion)}`,{method:'DELETE'}).then(()=>{loadAdminQuestions();toast('تم حذف السؤال');}).catch(err=>toast(err.message));return;}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-review-status]');if(b){apiRequest(`/api/admin/reviews/${encodeURIComponent(b.dataset.reviewId)}`,{method:'PATCH',body:JSON.stringify({status:b.dataset.reviewStatus})}).then(()=>{loadAdminReviews();apiRequest('/api/products').then(r=>{if(Array.isArray(r)){products=r;saveProducts();renderProducts();}});toast('تم تحديث حالة التقييم');}).catch(err=>toast(err.message));return;}const d=e.target.closest('[data-delete-review]');if(d){apiRequest(`/api/admin/reviews/${encodeURIComponent(d.dataset.deleteReview)}`,{method:'DELETE'}).then(()=>{loadAdminReviews();toast('تم حذف التقييم');}).catch(err=>toast(err.message));return;}});
document.addEventListener("click",e=>{const fav=e.target.closest("[data-favorite]");if(fav){toggleFavorite(Number(fav.dataset.favorite));return;}const add=e.target.closest("[data-add]");if(add){addToCart(Number(add.dataset.add));return;}const details=e.target.closest("[data-details]");if(details){openProductDetails(Number(details.dataset.details));return;}const detailAdd=e.target.closest("[data-detail-add]");if(detailAdd){const id=Number(detailAdd.dataset.detailAdd);const qty=Math.max(1,Number($("detailQty")?.value||1));for(let i=0;i<qty;i++)addToCart(id);closeProductDetails();return;}const detailBuy=e.target.closest("[data-detail-buy]");if(detailBuy){const id=Number(detailBuy.dataset.detailBuy);const qty=Math.max(1,Number($("detailQty")?.value||1));for(let i=0;i<qty;i++)addToCart(id);closeProductDetails();openCart();return;}const plus=e.target.closest("[data-plus]");if(plus){changeQty(Number(plus.dataset.plus),1);return;}const minus=e.target.closest("[data-minus]");if(minus){changeQty(Number(minus.dataset.minus),-1);return;}const remove=e.target.closest("[data-remove]");if(remove){cart=cart.filter(x=>x.id!==Number(remove.dataset.remove));saveCart();renderCart();return;}const setting=e.target.closest("[data-setting]");if(setting){handleSetting(setting.dataset.setting);return;}const favFilter=e.target.closest("[data-favorites-filter]");if(favFilter){favoritesOnly=!favoritesOnly;favFilter.classList.toggle("active",favoritesOnly);renderProducts();return;}const cat=e.target.closest(".cat");if(cat){document.querySelectorAll(".cat").forEach(b=>b.classList.remove("active"));cat.classList.add("active");currentCategory=cat.dataset.category;renderProducts();return;}const saveProduct=e.target.closest("[data-save-product]");if(saveProduct){const id=Number(saveProduct.dataset.saveProduct);const p=products.find(x=>x.id===id);if(!p)return;document.querySelectorAll(`[data-product-id="${id}"]`).forEach(el=>{if(el.dataset.field==='price')p.price=Math.max(0,Number(el.value)||0);else if(el.dataset.field==='salePrice')p.salePrice=el.value?Math.max(0,Number(el.value)):null;else if(el.dataset.field==='stock')p.stock=Math.max(0,Number(el.value)||0);else if(el.dataset.field)p[el.dataset.field]=el.value.trim();});p.name=p.name||'منتج بدون اسم';p.emoji=p.emoji||'🛍️';apiRequest(`/api/admin/products/${id}`,{method:'PATCH',body:JSON.stringify(p)}).then(saved=>{products=products.map(x=>x.id===id?saved:x);cart=cart.map(i=>i.id===id?{...i,...saved,price:effectivePrice(saved)}:i);saveProducts();saveCart();renderProducts();renderCart();renderAdmin();toast('تم حفظ تفاصيل المنتج في قاعدة البيانات');}).catch(err=>toast(err.message));return;}const del=e.target.closest("[data-delete-product]");if(del){const id=Number(del.dataset.deleteProduct);apiRequest(`/api/admin/products/${id}`,{method:'DELETE'}).then(()=>{products=products.filter(p=>p.id!==id);cart=cart.filter(i=>i.id!==id);saveProducts();saveCart();renderProducts();renderCart();renderAdmin();toast('تم حذف المنتج من قاعدة البيانات');}).catch(err=>toast(err.message));return;}const delOrder=e.target.closest('[data-delete-order]');if(delOrder){const id=Number(delOrder.dataset.deleteOrder);apiRequest(`/api/admin/orders/${id}`,{method:'DELETE'}).then(()=>{orders=orders.filter(o=>o.id!==id);saveOrders();renderAdmin();toast('تم حذف الطلب من قاعدة البيانات');}).catch(err=>toast(err.message));return;}});
document.addEventListener('change',e=>{const select=e.target.closest('[data-order-status-select]');if(select){const o=orders.find(x=>x.id===Number(select.dataset.orderStatusSelect));if(o){apiRequest(`/api/admin/orders/${o.id}`,{method:'PATCH',body:JSON.stringify({status:select.value})}).then(saved=>{o.status=saved.status;saveOrders();renderAdmin();toast('تم تحديث حالة الطلب في قاعدة البيانات');}).catch(err=>toast(err.message));}}if(e.target.id==='orderStatusFilter')renderAdmin();});
$("closeAdminOrderDetails")?.addEventListener("click",closeAdminOrderDetails);
document.addEventListener("click",e=>{const view=e.target.closest("[data-view-order]");if(view){e.preventDefault();openAdminOrderDetails(view.dataset.viewOrder);}});
$("searchInput").addEventListener("input",renderProducts);
$("minPriceFilter")?.addEventListener("input",e=>{minPriceFilter=e.target.value;renderProducts();});
$("maxPriceFilter")?.addEventListener("input",e=>{maxPriceFilter=e.target.value;renderProducts();});
$("ratingFilter")?.addEventListener("change",e=>{ratingFilter=Number(e.target.value||0);renderProducts();});
$("offerFilter")?.addEventListener("change",e=>{offerFilter=e.target.value;renderProducts();});
$("sortFilter")?.addEventListener("change",e=>{sortFilter=e.target.value;renderProducts();});
$("clearFiltersBtn")?.addEventListener("click",()=>{minPriceFilter="";maxPriceFilter="";ratingFilter=0;offerFilter="all";sortFilter="default";["minPriceFilter","maxPriceFilter"].forEach(id=>$(id).value="");$("ratingFilter").value="0";$("offerFilter").value="all";$("sortFilter").value="default";renderProducts();});$("menuBtn").addEventListener("click",toggleSettingsMenu);
$("closeAccount")?.addEventListener("click",closeAccount);$("accountOverlay")?.addEventListener("click",closeAccount);
document.addEventListener("click",e=>{if(!e.target.closest(".topbar-actions"))closeSettingsMenu();});
$("closeProduct").addEventListener("click",closeProductDetails);$("productOverlay").addEventListener("click",closeProductDetails);$("cartBtn").addEventListener("click",openCart);$("closeCart").addEventListener("click",closeCart);$("cartOverlay").addEventListener("click",closeCart);$("saveCart").addEventListener("click",()=>{saveCart();toast("تم حفظ السلة على هذا الجهاز");});$("orderWhatsApp").addEventListener("click",openCheckout);$("closeCheckout").addEventListener("click",closeCheckout);$("checkoutOverlay").addEventListener("click",closeCheckout);
$("checkoutForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),address=$("customerAddress").value.trim(),couponCode=$("couponCode")?.value.trim().toUpperCase()||"";if(!name||!phone||!address||!$("shippingZone").value)return toast("من فضلك أكمل بيانات الطلب واختر منطقة التوصيل");customer={name,phone,address};saveCustomer();otpState={challengeId:"",phone,name,address,couponCode,pointsToRedeem:Number($("redeemPoints")?.value||0),paymentMethod:document.querySelector("input[name=paymentMethod]:checked")?.value||"cod"};await sendOrder(name,phone,address,couponCode,"",otpState.pointsToRedeem);});
$("shippingZone")?.addEventListener("change",updateCheckoutSummary);
$("shippingZone")?.addEventListener("change",()=>updateCheckoutSummary());
$("applyCouponBtn")?.addEventListener("click",async()=>{const code=$("couponCode").value.trim().toUpperCase();if(!code){selectedCoupon=null;$("couponMessage").textContent="";updateCheckoutSummary();return;}try{selectedCoupon=await apiRequest("/api/coupons/validate",{method:"POST",body:JSON.stringify({code,subtotal:checkoutSubtotal()})});$("couponMessage").textContent=`تم تطبيق ${selectedCoupon.label||"الخصم"}: -${money(selectedCoupon.discount)}`;updateCheckoutSummary();}catch(err){selectedCoupon=null;$("couponMessage").textContent=err.message;updateCheckoutSummary();}});
$("closeAdmin").addEventListener("click",closeAdmin);$("adminOverlay").addEventListener("click",()=>{closeAdmin();closeAdminLogin();});
$("closeAdminLogin")?.addEventListener("click",closeAdminLogin);
$("adminLoginForm")?.addEventListener("submit",async e=>{e.preventDefault();const msg=$("adminLoginMessage"),creating=$("adminBootstrapBtn")?.dataset.mode==="create";msg.textContent=creating?"جارٍ إنشاء حساب المدير...":"جارٍ التحقق...";try{const result=await apiRequest(creating?"/api/admin/bootstrap":"/api/auth/login",{method:"POST",body:JSON.stringify({name:"مدير لقطة",email:$("adminEmail").value.trim(),password:$("adminPassword").value})});if(!creating&&result.user?.role!=="admin")throw new Error("هذا الحساب ليس حساب مدير");adminUser=result.user;adminUnlocked=true;localStorage.removeItem("loqataAdminLoggedOut");closeAdminLogin();renderAdmin();$("adminModal").hidden=false;$("adminOverlay").classList.remove("hidden");document.body.classList.add("modal-open");toast(creating?"تم إنشاء حساب المدير وتسجيل الدخول":"تم تسجيل دخول الإدارة");}catch(err){msg.textContent=err.message|| (creating?"تعذر إنشاء حساب المدير":"تعذر تسجيل الدخول");}});
$("adminBootstrapBtn")?.addEventListener("click",()=>{
  const title=$("adminLoginTitle"), submit=$("adminLoginForm")?.querySelector("button[type=submit]"), btn=$("adminBootstrapBtn"), msg=$("adminLoginMessage");
  const creating=btn.dataset.mode!=="create";
  btn.dataset.mode=creating?"create":"login";
  title.textContent=creating?"🛡️ إنشاء حساب المدير":"🔐 دخول الإدارة";
  submit.textContent=creating?"إنشاء حساب المدير":"دخول الإدارة";
  btn.textContent=creating?"العودة إلى تسجيل دخول الإدارة":"إنشاء حساب المدير لأول مرة";
  msg.textContent=creating?"أدخل بريد المدير وكلمة مرور لا تقل عن 10 أحرف ثم اضغط إنشاء الحساب.":"";
});

$("addProductForm").addEventListener("submit",e=>{e.preventDefault();const name=$("newProductName").value.trim(),price=Number($("newProductPrice").value),stock=Number($("newProductStock").value),category=$("newProductCategory").value,emoji=$("newProductEmoji").value.trim()||"🛍️",image=$("newProductImage").value.trim(),description=$("newProductDescription").value.trim()||"منتج جديد من متجر لقطة.";if(!name||!Number.isFinite(price)||price<0||!Number.isFinite(stock)||stock<0)return toast('تحقق من بيانات المنتج');apiRequest('/api/admin/products',{method:'POST',body:JSON.stringify({name,price,stock,category,emoji,image,description})}).then(saved=>{products.push(saved);saveProducts();renderProducts();renderAdmin();e.target.reset();toast('تمت إضافة المنتج إلى قاعدة البيانات');}).catch(err=>toast(err.message));});
$("csvExportBtn")?.addEventListener("click",exportOrdersCSV);$("clearOrdersBtn").addEventListener('click',()=>{const before=orders.length;orders=orders.filter(o=>o.status!=='مكتمل');saveOrders();renderAdmin();toast(before===orders.length?'لا توجد طلبات مكتملة':'تم حذف الطلبات المكتملة');});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeProductDetails();closeCheckout();closeAdmin();closeSettingsMenu();}});renderProducts();renderCart();loadCampaigns();

function importData(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.products)||!Array.isArray(data.orders))throw new Error("invalid");products=data.products;orders=data.orders;cart=Array.isArray(data.cart)?data.cart:[];favorites=Array.isArray(data.favorites)?data.favorites:[];saveProducts();saveOrders();saveCart();saveFavorites();renderProducts();renderCart();renderAdmin();toast("تم استيراد النسخة الاحتياطية");}catch{toast("ملف النسخة الاحتياطية غير صالح");}};reader.readAsText(file);}
function exportOrdersCSV(){const rows=[["رقم الطلب","الاسم","الهاتف","العنوان","الحالة","الإجمالي","التاريخ"],...orders.map(o=>[o.id,o.name,o.phone,o.address,o.status,o.total,o.date])];const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='loqata-orders.csv';a.click();URL.revokeObjectURL(url);toast('تم تصدير الطلبات CSV');}
function exportData(){const data={products,orders,cart,favorites,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="loqata-backup.json";a.click();URL.revokeObjectURL(url);toast("تم تصدير نسخة احتياطية");}
$("exportDataBtn")?.addEventListener("click",exportData);$("importDataInput")?.addEventListener("change",e=>importData(e.target.files[0]));$("adminOrderSearch")?.addEventListener("input",e=>{adminOrderQuery=e.target.value.trim().toLowerCase();renderAdmin();});


// v2.4.0: اتصال واجهة العميل بخادم المصادقة الحقيقي
let authMode = "login";
let authenticatedUser = null;
async 
async function openAdminOrderDetails(orderId){
  adminOrderDetailsId=String(orderId);
  const box=$("adminOrderDetails"); if(!box)return;
  $("adminOrderDetailsModal").hidden=false;
  document.body.classList.add("modal-open");
  box.innerHTML='<p class="empty">جارٍ تحميل تفاصيل الطلب...</p>';
  try{
    const data=await apiRequest(`/api/admin/orders/${encodeURIComponent(orderId)}/details`);
    renderAdminOrderDetails(data);
  }catch(err){box.innerHTML=`<p class="empty">${escapeHtml(err.message)}</p>`;}
}
function renderAdminOrderDetails(data){
  const o=data.order||{}, timeline=data.timeline||[], notes=data.notes||[];
  const items=(o.items||[]).map(i=>`<tr><td>${escapeHtml(i.name)}</td><td>${Number(i.qty||0)}</td><td>${money(i.price)}</td><td>${money(Number(i.qty||0)*Number(i.price||0))}</td></tr>`).join("");
  const history=timeline.length?timeline.map(x=>`<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${escapeHtml(x.title||x.type||"تحديث")}</strong><p>${escapeHtml(x.note||"")}</p><small>${escapeHtml(x.actorName||"مدير المتجر")} — ${escapeHtml(new Date(x.date||Date.now()).toLocaleString("ar-EG"))}</small></div></div>`).join(""):'<p class="empty">لا يوجد سجل نشاط بعد.</p>';
  const notesHtml=notes.length?notes.map(n=>`<div class="admin-note-card"><strong>${escapeHtml(n.actorName||"مدير المتجر")}</strong><small>${escapeHtml(new Date(n.date||Date.now()).toLocaleString("ar-EG"))}</small><p>${escapeHtml(n.text)}</p></div>`).join(""):'<p class="empty">لا توجد ملاحظات.</p>';
  $("adminOrderDetails").innerHTML=`
    <div class="order-detail-grid">
      <div class="order-detail-card"><h3>📦 بيانات الطلب</h3><p><strong>رقم الطلب:</strong> #${escapeHtml(o.id)}</p><p><strong>التاريخ:</strong> ${escapeHtml(o.date||"")}</p><p><strong>العميل:</strong> ${escapeHtml(o.name||"")}</p><p><strong>الهاتف:</strong> ${escapeHtml(o.phone||"")}</p><p><strong>العنوان:</strong> ${escapeHtml(o.address||"")}</p></div>
      <div class="order-detail-card"><h3>💳 الدفع والشحن</h3><p><strong>طريقة الدفع:</strong> ${escapeHtml(o.paymentMethodName||o.paymentMethod||"غير محدد")}</p><p><strong>حالة الدفع:</strong> <span class="status-pill">${escapeHtml(o.paymentStatus||"غير محدد")}</span></p><p><strong>منطقة الشحن:</strong> ${escapeHtml(o.shippingZoneName||"غير محددة")}</p><p><strong>شركة الشحن:</strong> ${escapeHtml(o.shippingCarrier||"غير محددة")}</p><p><strong>رقم التتبع:</strong> ${escapeHtml(o.trackingNumber||"غير موجود")}</p><p><strong>حالة الشحن:</strong> ${escapeHtml(({preparing:"قيد التجهيز",shipped:"تم الشحن",in_transit:"في الطريق",delivered:"تم التسليم",returned:"مرتجع"})[o.shippingStatus]||"قيد التجهيز")}</p>${o.trackingUrl?`<p><a class="secondary-btn small-btn" href="${escapeHtml(o.trackingUrl)}" target="_blank" rel="noopener">🔗 فتح رابط التتبع</a></p>`:""}</div>
    </div>
    <div class="order-detail-card"><h3>🛒 المنتجات</h3><div class="table-scroll"><table class="order-detail-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${items||'<tr><td colspan="4">لا توجد منتجات</td></tr>'}</tbody></table></div>
      <div class="detail-totals"><span>قبل الخصم: <b>${money(o.subtotal??o.total)}</b></span><span>الخصم: <b>${money(o.discount||0)}</b></span><span>الشحن: <b>${money(o.shippingFee||0)}</b></span><strong>الإجمالي النهائي: ${money(o.total)}</strong></div>
    </div>
    <div class="order-detail-card"><h3>⚙️ إجراءات الطلب</h3><div class="detail-actions">
      <label>الحالة<select id="detailStatus"><option ${o.status==="جديد"?"selected":""}>جديد</option><option ${o.status==="قيد التجهيز"?"selected":""}>قيد التجهيز</option><option ${o.status==="تم الشحن"?"selected":""}>تم الشحن</option><option ${o.status==="مكتمل"?"selected":""}>مكتمل</option><option ${o.status==="ملغي"?"selected":""}>ملغي</option></select></label>
      <label>حالة الدفع<select id="detailPaymentStatus"><option value="pending" ${o.paymentStatus==="pending"?"selected":""}>معلق</option><option value="paid" ${o.paymentStatus==="paid"?"selected":""}>مدفوع</option><option value="failed" ${o.paymentStatus==="failed"?"selected":""}>فشل</option></select></label>
      <label>شركة الشحن<input id="detailCarrier" value="${escapeHtml(o.shippingCarrier||"")}"></label>
      <label>رقم التتبع<input id="detailTracking" value="${escapeHtml(o.trackingNumber||"")}" placeholder="مثال: 123456789"></label>
      <label>حالة الشحن<select id="detailShippingStatus"><option value="preparing" ${(o.shippingStatus||"preparing")==="preparing"?"selected":""}>قيد التجهيز</option><option value="shipped" ${o.shippingStatus==="shipped"?"selected":""}>تم الشحن</option><option value="in_transit" ${o.shippingStatus==="in_transit"?"selected":""}>في الطريق</option><option value="delivered" ${o.shippingStatus==="delivered"?"selected":""}>تم التسليم</option><option value="returned" ${o.shippingStatus==="returned"?"selected":""}>مرتجع</option></select></label>
      <label>رابط التتبع<input id="detailTrackingUrl" type="url" value="${escapeHtml(o.trackingUrl||"")}" placeholder="https://..."></label>
      <label>ملاحظة الشحن<input id="detailShippingNote" placeholder="اختياري: وصلت لمخزن الشركة"></label>
      <button type="button" class="primary-btn" id="saveOrderDetails">💾 حفظ التحديث</button><button type="button" class="secondary-btn" id="printOrderDetails">🖨️ طباعة</button>
    </div></div>
    <div class="order-detail-card"><h3>🕐 سجل الطلب</h3><div class="timeline">${history}</div></div>
    <div class="order-detail-card"><h3>📝 ملاحظات الإدارة</h3><div>${notesHtml}</div><form id="orderNoteForm" class="note-form"><textarea id="newOrderNote" rows="3" placeholder="اكتب ملاحظة داخلية..."></textarea><button class="secondary-btn" type="submit">إضافة ملاحظة</button></form></div>`;
  $("saveOrderDetails").onclick=async()=>{
    try{
      const shipping=await apiRequest(`/api/admin/orders/${encodeURIComponent(adminOrderDetailsId)}/shipping`,{method:"PATCH",body:JSON.stringify({carrier:$("detailCarrier").value.trim(),trackingNumber:$("detailTracking").value.trim(),trackingUrl:$("detailTrackingUrl").value.trim(),status:$("detailShippingStatus").value,note:$("detailShippingNote").value.trim()})});
      const saved=await apiRequest(`/api/admin/orders/${encodeURIComponent(adminOrderDetailsId)}/details`,{method:"PATCH",body:JSON.stringify({status:$("detailStatus").value,paymentStatus:$("detailPaymentStatus").value,shippingCarrier:$("detailCarrier").value.trim(),trackingNumber:$("detailTracking").value.trim()})});
      orders=orders.map(x=>String(x.id)===String(saved.id)?saved:x);saveOrders();renderAdmin();renderAdminOrderDetails({order:saved,timeline:saved.timeline||saved.statusHistory||[],notes:saved.adminNotes||[]});toast("تم تحديث الطلب");
    }catch(err){toast(err.message);}
  };
  $("printOrderDetails").onclick=()=>window.print();
  $("orderNoteForm").onsubmit=async e=>{e.preventDefault();const text=$("newOrderNote").value.trim();if(!text)return toast("اكتب الملاحظة أولًا");try{const data=await apiRequest(`/api/admin/orders/${encodeURIComponent(adminOrderDetailsId)}/notes`,{method:"POST",body:JSON.stringify({text})});renderAdminOrderDetails(data);toast("تمت إضافة الملاحظة");}catch(err){toast(err.message);}};
}
async function openCustomerTracking(orderId){
  try{
    const d=await apiRequest(`/api/orders/${encodeURIComponent(orderId)}/tracking`);
    const labels={preparing:"قيد التجهيز",shipped:"تم الشحن",in_transit:"في الطريق",delivered:"تم التسليم",returned:"مرتجع"};
    const lines=(d.timeline||[]).map(e=>`<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${escapeHtml(e.title||labels[e.status]||e.status||'تحديث')}</strong><p>${escapeHtml(e.note||'')}</p><small>${escapeHtml(new Date(e.date||Date.now()).toLocaleString('ar-EG'))}</small></div></div>`).join('')||'<p class="empty">لم تُسجل تحديثات شحن بعد.</p>';
    const link=d.shipping.trackingUrl?`<a class="primary-btn small-btn" href="${escapeHtml(d.shipping.trackingUrl)}" target="_blank" rel="noopener">🔗 تتبع لدى شركة الشحن</a>`:'';
    const box=$('accountOrders'); box.insertAdjacentHTML('afterbegin',`<div class="order-detail-card customer-tracking"><h3>🚚 تتبع الطلب #${escapeHtml(d.orderId)}</h3><p><strong>الحالة:</strong> ${escapeHtml(labels[d.shipping.status]||d.shipping.status)}</p><p><strong>شركة الشحن:</strong> ${escapeHtml(d.shipping.carrier||'غير محددة')}<br><strong>رقم التتبع:</strong> ${escapeHtml(d.shipping.trackingNumber||'غير متوفر')}</p>${link}<div class="timeline">${lines}</div></div>`);
  }catch(err){toast(err.message);}
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-track-order]');if(t)openCustomerTracking(t.dataset.trackOrder);});
function closeAdminOrderDetails(){const m=$("adminOrderDetailsModal");if(m)m.hidden=true;adminOrderDetailsId=null;document.body.classList.remove("modal-open");}
function apiUrl(path){
  const base=String(window.LOQATA_CONFIG?.API_BASE_URL||"").trim().replace(/\/$/,"");
  if(!base) return path;
  return `${base}${path.startsWith("/")?path:`/${path}`}`;
}
async function apiRequest(url, options={}){
  const target=apiUrl(url);
  const isCrossOrigin=target.startsWith("http") && new URL(target,window.location.href).origin!==window.location.origin;
  const method=String(options.method||"GET").toUpperCase();
  const headers={...(options.headers||{})};
  // Do not attach application/json to plain GET requests. That header forces a CORS
  // preflight in browsers and can prevent public catalogue data from loading.
  if(method!=="GET" && method!=="HEAD" && options.body!=null && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"]="application/json";
  }
  let response;
  try {
    response = await fetch(target, {...options, method, headers, credentials:isCrossOrigin?"include":"same-origin", cache:method==="GET"?"no-store":options.cache});
  } catch (err) {
    if (isCrossOrigin) throw new Error("تعذر الوصول إلى خادم لقطة. تأكد أن Railway يعمل وأن Public Domain صحيح ثم راجع FRONTEND_ORIGIN.");
    throw new Error("تعذر الاتصال بخادم متجر لقطة. شغّل server.js أو افتح المتجر من رابط الخادم.");
  }
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || "حدث خطأ في الاتصال بالخادم");
  return data;
}
let adminShipping={zones:[],freeShippingThreshold:1000};
async function loadAdminShipping(){try{adminShipping=await apiRequest("/api/admin/shipping");const box=$("shippingZonesAdmin");if(box)box.innerHTML=(adminShipping.zones||[]).map(z=>`<label>رسوم ${escapeHtml(z.name)}<input type="number" min="0" step="0.01" data-shipping-fee="${escapeHtml(z.id)}" value="${Number(z.fee||0)}"></label>`).join("");$("freeShippingThreshold").value=Number(adminShipping.freeShippingThreshold||0);}catch(e){toast(e.message);}}
$("shippingSettingsForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const zones=(adminShipping.zones||[]).map(z=>({...z,fee:Number(document.querySelector(`[data-shipping-fee="${z.id}"]`)?.value||0)}));adminShipping=await apiRequest("/api/admin/shipping",{method:"PUT",body:JSON.stringify({zones,freeShippingThreshold:Number($("freeShippingThreshold").value||0)})});shippingSettings=adminShipping;renderAdmin();toast("تم حفظ إعدادات الشحن");}catch(err){toast(err.message);}});
async function loadAdminCoupons(){try{adminCoupons=await apiRequest("/api/admin/coupons");}catch(err){adminCoupons=[];toast(err.message);}}
$("couponForm")?.addEventListener("submit",e=>{e.preventDefault();const code=$("couponCodeAdmin").value.trim().toUpperCase(),type=$("couponTypeAdmin").value,value=Number($("couponValueAdmin").value),minSubtotal=Number($("couponMinAdmin").value||0),expiresAt=$("couponExpiryAdmin").value||null,label=$("couponLabelAdmin").value.trim();if(!code||!Number.isFinite(value)||value<=0)return toast("أدخل بيانات كوبون صحيحة");apiRequest("/api/admin/coupons",{method:"POST",body:JSON.stringify({code,type,value,minSubtotal,expiresAt,label})}).then(c=>{adminCoupons.unshift(c);e.target.reset();renderAdmin();toast("تم إنشاء الكوبون");}).catch(err=>toast(err.message));});
function showAuth(){
  authMode="login"; $("authName").value=""; $("authEmail").value=""; $("authPassword").value="";
  $("authTitle").textContent=authenticatedUser?`👤 ${authenticatedUser.name}`:"🔐 حساب العميل";
  $("authName").hidden=!!authenticatedUser; $("authPassword").hidden=!!authenticatedUser;
  $("authEmail").disabled=!!authenticatedUser; $("authEmail").value=authenticatedUser?.email||"";
  $("authSubmit").hidden=!!authenticatedUser; $("authMode").hidden=!!authenticatedUser; $("authLogout").hidden=!authenticatedUser;
  $("authMessage").textContent=authenticatedUser?"أنت مسجل الدخول بالفعل.":"";
  $("authModal").hidden=false; $("authOverlay").classList.remove("hidden"); document.body.classList.add("modal-open");
}
function closeAuth(){ $("authModal").hidden=true; $("authOverlay").classList.add("hidden"); document.body.classList.remove("modal-open"); }
async function loadAuth(){try{authenticatedUser=(await apiRequest('/api/auth/me')).user;await syncWishlistFromServer();}catch{authenticatedUser=null;}}
async function syncWishlistFromServer(){if(!authenticatedUser)return;try{const r=await apiRequest('/api/wishlist');const remote=Array.isArray(r.productIds)?r.productIds:[];favorites=[...new Set([...favorites,...remote])];saveFavorites();renderProducts();loadRecommendations();}catch(e){console.warn('تعذر مزامنة المتابعة',e.message);}}
$("closeAuth")?.addEventListener("click",closeAuth); $("authOverlay")?.addEventListener("click",closeAuth);
$("authMode")?.addEventListener("click",()=>{authMode=authMode==="login"?"register":"login";$("authTitle").textContent=authMode==="login"?"🔐 تسجيل الدخول":"📝 إنشاء حساب";$("authName").hidden=authMode==="login";$("authSubmit").textContent=authMode==="login"?"تسجيل الدخول":"إنشاء الحساب";$("authMode").textContent=authMode==="login"?"إنشاء حساب جديد":"لدي حساب بالفعل";$("authMessage").textContent="";});
$("closeOtp")?.addEventListener("click",()=>{ $("otpModal").hidden=true; $("otpOverlay").classList.add("hidden"); $("checkoutModal").hidden=false; });
$("otpOverlay")?.addEventListener("click",()=>{ $("otpModal").hidden=true; $("otpOverlay").classList.add("hidden"); });
$("resendOtp")?.addEventListener("click",async()=>{try{const r=await apiRequest("/api/otp/request",{method:"POST",body:JSON.stringify({phone:otpState.phone})});otpState.challengeId=r.challengeId;$("otpMessage").textContent=r.devCode?`وضع التطوير: رمز التحقق ${r.devCode}`:"تم إرسال رمز جديد";}catch(err){$("otpMessage").textContent=err.message;}});
$("otpForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const r=await apiRequest("/api/otp/verify",{method:"POST",body:JSON.stringify({challengeId:otpState.challengeId,phone:otpState.phone,code:$("otpCode").value.trim()})});$("otpModal").hidden=true;$("otpOverlay").classList.add("hidden");await sendOrder(otpState.name,otpState.phone,otpState.address,otpState.couponCode,r.verificationToken,otpState.pointsToRedeem);}catch(err){$("otpMessage").textContent=err.message;}});
$("demoPaySuccess")?.addEventListener("click",()=>completeDemoPayment(true));$("demoPayFail")?.addEventListener("click",()=>completeDemoPayment(false));
$("authForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const payload={email:$("authEmail").value.trim(),password:$("authPassword").value};if(authMode==="register")payload.name=$("authName").value.trim();const result=await apiRequest(authMode==="login"?'/api/auth/login':'/api/auth/register',{method:'POST',body:JSON.stringify(payload)});authenticatedUser=result.user;await syncWishlistFromServer();toast('تم تسجيل الدخول بنجاح');closeAuth();}catch(err){$("authMessage").textContent=err.message;}});
$("authLogout")?.addEventListener("click",async()=>{try{await apiRequest('/api/auth/logout',{method:'POST'});authenticatedUser=null;toast('تم تسجيل الخروج');closeAuth();}catch(err){toast(err.message);}});
const originalHandleSetting=handleSetting;
handleSetting=function(action){if(action==="account"){showAuth();return;}return originalHandleSetting(action);};
loadAuth();

// v2.5: تحميل المنتجات من قاعدة البيانات عند تشغيل المتجر
(async function syncProductsFromServer(){
  try{
    const remote=await apiRequest("/api/products");
    if(!Array.isArray(remote)) throw new Error("استجابة المنتجات غير صالحة");
    // An empty backend database must not blank the public storefront.
    products=remote.length ? remote : defaultProducts;
    saveProducts();
    renderProducts();
    loadRecommendations();
  }catch(err){
    console.warn("تعذر الاتصال بقاعدة البيانات",err.message);
    if(!Array.isArray(products)||!products.length) products=defaultProducts;
    renderProducts();
    loadRecommendations();
  }
})();

// v2.8.0: صفحة حساب العميل المرتبطة بقاعدة البيانات
async function openCustomerAccount(){
  try{
    let mine=[];
    if(authenticatedUser){try{const profile=await apiRequest('/api/profile');authenticatedUser=profile.user;mine=await apiRequest('/api/orders/mine');}catch{mine=[];}}
    const savedCustomer=getSavedCustomer();
    customer={...savedCustomer};
    $("accountName").value=savedCustomer.name||(authenticatedUser?.name||'');
    $("accountPhone").value=savedCustomer.phone||'';
    $("accountAddress").value=savedCustomer.address||'';
    $("accountOrders").innerHTML=mine.length?`<h3>طلباتي السابقة</h3>${mine.map(o=>`<details class="order-card"><summary>#${escapeHtml(o.id)} — ${money(o.total)} — ${escapeHtml(o.status||'جديد')}</summary><p>${escapeHtml(o.date||'')}<br>${(o.items||[]).map(i=>`${escapeHtml(i.name)} × ${i.qty}`).join('<br>')}</p><button type="button" class="secondary-btn small-btn" data-track-order="${escapeHtml(o.id)}">🚚 تتبع الشحنة</button></details>`).join('')}`:'<p class="empty">لا توجد طلبات مرتبطة بحسابك حتى الآن.</p>';
    $("accountModal").hidden=false;$("accountOverlay").classList.remove('hidden');document.body.classList.add('modal-open');
  }catch(err){toast(err.message);}
}
$("closeAccount")?.addEventListener('click',()=>{$("accountModal").hidden=true;$('accountOverlay').classList.add('hidden');document.body.classList.remove('modal-open');});
$("accountOverlay")?.addEventListener('click',()=>{$("accountModal").hidden=true;$('accountOverlay').classList.add('hidden');document.body.classList.remove('modal-open');});
$("accountForm")?.addEventListener('submit',e=>{e.preventDefault();customer={name:$('accountName').value.trim(),phone:$('accountPhone').value.trim(),address:$('accountAddress').value.trim()};saveCustomer();fillCheckoutFromSavedCustomer();toast('تم حفظ البيانات وستظهر تلقائيًا في الطلب');});
['accountName','accountPhone','accountAddress'].forEach(id=>$(id)?.addEventListener('input',()=>{customer={name:$('accountName').value.trim(),phone:$('accountPhone').value.trim(),address:$('accountAddress').value.trim()};saveCustomer();}));
const previousHandleSetting=handleSetting;
handleSetting=function(action){if(action==='account'){openCustomerAccount();return;}return previousHandleSetting(action);};


// v4.2.0: إدارة العملاء وربط العميل بكل طلباته وسجل الدفع والشحن
let adminCustomers=[];
async function loadAdminCustomers(){
  const box=$("adminCustomers"); if(!box)return;
  try{adminCustomers=await apiRequest('/api/admin/customers'); renderAdminCustomers();}
  catch(err){box.innerHTML=`<p class="empty">${escapeHtml(err.message)}</p>`;}
}
function renderAdminCustomers(){
  const box=$("adminCustomers"); if(!box)return;
  const q=String($("adminCustomerSearch")?.value||'').trim().toLowerCase();
  const rows=adminCustomers.filter(c=>[c.name,c.email,c.phone].some(v=>String(v||'').toLowerCase().includes(q)));
  box.innerHTML=rows.length?rows.map(c=>`<button type="button" class="order-card customer-row" data-customer-id="${escapeHtml(c.id)}"><strong>${escapeHtml(c.name||'بدون اسم')}</strong><p>${escapeHtml(c.email||'')}<br>📱 ${escapeHtml(c.phone||'غير مسجل')}<br>الطلبات: ${c.orders} — إجمالي المشتريات: ${money(c.totalSpent)}</p></button>`).join(''):'<p class="empty">لا يوجد عملاء مطابقون.</p>';
}
async function showAdminCustomer(id){
  const box=$("adminCustomerDetails"); if(!box)return;
  try{const data=await apiRequest(`/api/admin/customers/${encodeURIComponent(id)}`);const c=data.customer;box.innerHTML=`<div class="order-card"><h3>👤 ${escapeHtml(c.name||'عميل')}</h3><p>البريد: ${escapeHtml(c.email||'')}<br>الهاتف: ${escapeHtml(c.phone||'غير مسجل')}</p><h4>سجل الطلبات</h4>${data.orders.length?data.orders.map(o=>`<details class="order-card"><summary>#${escapeHtml(o.id)} — ${money(o.total)} — ${escapeHtml(o.status||'جديد')} — ${escapeHtml(o.paymentStatus||'')}</summary><p>الدفع: ${escapeHtml(o.paymentMethodName||o.paymentMethod||'')}<br>الشحن: ${escapeHtml(o.shippingZoneName||'')} — ${money(o.shippingFee||0)}<br>آخر تحديث: ${escapeHtml(o.statusHistory?.at(-1)?.date||o.date||'')} </p></details>`).join(''):'<p class="empty">لا توجد طلبات.</p>'}</div>`;}
  catch(err){box.innerHTML=`<p class="empty">${escapeHtml(err.message)}</p>`;}
}
$("adminCustomerSearch")?.addEventListener('input',renderAdminCustomers);
document.addEventListener('click',e=>{const row=e.target.closest('[data-customer-id]');if(row)showAdminCustomer(row.dataset.customerId);});
const _renderAdminBeforeCustomers=renderAdmin;
renderAdmin=async function(){await _renderAdminBeforeCustomers();loadAdminCustomers();};
$('campaignForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const c=await apiRequest('/api/admin/campaigns',{method:'POST',body:JSON.stringify({title:$('campaignTitle').value.trim(),message:$('campaignMessage').value.trim(),ctaLabel:$('campaignCta').value.trim(),couponCode:$('campaignCoupon').value.trim(),startsAt:$('campaignStarts').value||null,endsAt:$('campaignEnds').value||null,active:$('campaignActive').checked})});adminCampaigns.unshift(c);e.target.reset();$('campaignActive').checked=true;renderAdminCampaigns();loadCampaigns();toast('تم إنشاء الحملة');}catch(err){toast(err.message);}});
async function loadAdminLoyalty(){const box=$("adminLoyalty");if(!box)return;try{const d=await apiRequest('/api/admin/loyalty');const c=d.config||{};if($("loyaltyPointsPerCurrency"))$("loyaltyPointsPerCurrency").value=c.pointsPerCurrency??0.1;if($("loyaltyPointValue"))$("loyaltyPointValue").value=c.pointValue??1;if($("loyaltyMinRedeem"))$("loyaltyMinRedeem").value=c.minRedeem??10;box.innerHTML=(d.customers||[]).map(u=>`<div class="admin-product-card admin-loyalty-row"><div><strong>${escapeHtml(u.name||u.email)}</strong><p>${escapeHtml(u.email||'')} — الرصيد: <strong>${Number(u.points||0).toLocaleString('ar-EG')}</strong> نقطة</p></div><div><input type="number" step="1" placeholder="+/- نقاط" data-loyalty-delta="${escapeHtml(u.id)}"><button type="button" data-save-loyalty="${escapeHtml(u.id)}">تعديل الرصيد</button></div></div>`).join('')||'<p class="empty">لا يوجد عملاء بعد.</p>';}catch(e){box.innerHTML=`<p class="empty">${escapeHtml(e.message)}</p>`;}}
$('notificationSettingsForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await apiRequest('/api/admin/notification-settings',{method:'PUT',body:JSON.stringify(notificationSettingsPayload())});toast('تم حفظ إعدادات وقوالب الإشعارات');loadNotificationSettings();}catch(err){toast(err.message);}});
$('notificationDefaultsBtn')?.addEventListener('click',async()=>{try{const defaults={settings:{customer:{order_created:true,order_status:true,shipping_update:true,payment_update:true},admin:{new_order:true,order_status:true,shipping_update:true,payment_update:true}},templates:{new_order:{title:'طلب جديد',message:'تم استلام طلب جديد #{orderId} بقيمة {total} ج.م.'},order_created:{title:'تم استلام طلبك',message:'تم إنشاء الطلب #{orderId} بقيمة {total} ج.م بنجاح.'},order_status:{title:'تحديث حالة الطلب',message:'الطلب #{orderId}: الحالة الآن {status}.'},shipping_update:{title:'تحديث شحنتك',message:'الطلب #{orderId}: حالة الشحن {shippingStatus}{tracking}.'},payment_update:{title:'تحديث الدفع',message:'الطلب #{orderId}: حالة الدفع {paymentStatus}.'}}};await apiRequest('/api/admin/notification-settings',{method:'PUT',body:JSON.stringify(defaults)});loadNotificationSettings();toast('تمت استعادة الإعدادات الافتراضية');}catch(err){toast(err.message);}});


$("redeemPoints")?.addEventListener("input",()=>{const max=Math.floor(Number(loyalty.points||0));if(Number($("redeemPoints").value)>max)$("redeemPoints").value=max;updateCheckoutSummary();});
$("loyaltyConfigForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await apiRequest('/api/admin/loyalty/config',{method:'PUT',body:JSON.stringify({pointsPerCurrency:Number($("loyaltyPointsPerCurrency").value),pointValue:Number($("loyaltyPointValue").value),minRedeem:Number($("loyaltyMinRedeem").value)})});toast('تم حفظ إعدادات نقاط الولاء');}catch(err){toast(err.message);}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-save-loyalty]');if(!b)return;const input=document.querySelector(`[data-loyalty-delta="${CSS.escape(b.dataset.saveLoyalty)}"]`);const delta=Number(input?.value||0);if(!Number.isInteger(delta)||!delta)return toast('أدخل عدد نقاط صحيح');apiRequest(`/api/admin/loyalty/${encodeURIComponent(b.dataset.saveLoyalty)}`,{method:'PATCH',body:JSON.stringify({delta})}).then(()=>{if(input)input.value='';loadAdminLoyalty();toast('تم تعديل رصيد النقاط');}).catch(err=>toast(err.message));});
