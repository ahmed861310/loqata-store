const products = [
  {id:1,name:"سماعة بلوتوث",price:450,category:"electronics",emoji:"🎧"},
  {id:2,name:"ساعة ذكية",price:850,category:"electronics",emoji:"⌚"},
  {id:3,name:"تيشيرت كاجوال",price:320,category:"fashion",emoji:"👕"},
  {id:4,name:"شنطة ظهر",price:390,category:"fashion",emoji:"🎒"},
  {id:5,name:"كوب حراري",price:220,category:"home",emoji:"☕"},
  {id:6,name:"مصباح مكتب",price:280,category:"home",emoji:"💡"},
  {id:7,name:"شاحن سريع",price:250,category:"electronics",emoji:"🔌"},
  {id:8,name:"حافظة هاتف",price:150,category:"electronics",emoji:"📱"}
];

const whatsappNumber = "201149902302";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[char]));
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("loqataCart") || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(item =>
      item && Number.isInteger(item.id) && Number.isFinite(item.price) &&
      Number.isInteger(item.qty) && item.qty > 0 &&
      typeof item.name === "string" && typeof item.emoji === "string"
    );
  } catch {
    localStorage.removeItem("loqataCart");
    return [];
  }
}

let cart = loadCart();
let currentCategory = "all";

const $ = id => document.getElementById(id);
const money = n => `${Number(n).toLocaleString("ar-EG")} ج.م`;

function save() {
  localStorage.setItem("loqataCart", JSON.stringify(cart));
}

function renderProducts() {
  const q = $("searchInput").value.trim().toLowerCase();
  const filtered = products.filter(p =>
    (currentCategory === "all" || p.category === currentCategory) &&
    p.name.toLowerCase().includes(q)
  );
  $("products").innerHTML = filtered.map(p => `
    <article class="card">
      <div class="product-img" aria-hidden="true">${escapeHtml(p.emoji)}</div>
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price">${money(p.price)}</div>
        <button class="add-btn" data-add="${p.id}" type="button">أضف للسلة</button>
      </div>
    </article>
  `).join("");
  $("resultCount").textContent = `${filtered.length} منتج`;
  $("emptyState").classList.toggle("hidden", filtered.length !== 0);
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
}

function renderCart() {
  $("cartCount").textContent = cartCount();
  $("cartTotal").textContent = money(cartTotal());
  if (!cart.length) {
    $("cartItems").innerHTML = `<div class="empty">السلة فارغة حاليًا.</div>`;
    return;
  }
  $("cartItems").innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-emoji">${escapeHtml(item.emoji)}</div>
      <div class="cart-info">
        <strong>${escapeHtml(item.name)}</strong>
        <div>${money(item.price)}</div>
        <div class="qty">
          <button type="button" data-minus="${item.id}">−</button>
          <span>${item.qty}</span>
          <button type="button" data-plus="${item.id}">+</button>
          <button class="remove" type="button" data-remove="${item.id}">حذف</button>
        </div>
      </div>
    </div>
  `).join("");
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove("show"), 1800);
}

function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const found = cart.find(x => x.id === id);
  if (found) found.qty += 1;
  else cart.push({...p, qty:1});
  save();
  renderCart();
  toast("تمت إضافة المنتج للسلة");
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  save();
  renderCart();
}

function openCart() {
  $("cartPanel").classList.add("open");
  $("cartOverlay").classList.remove("hidden");
}
function closeCart() {
  $("cartPanel").classList.remove("open");
  $("cartOverlay").classList.add("hidden");
}

document.addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) addToCart(Number(add.dataset.add));

  const plus = e.target.closest("[data-plus]");
  if (plus) changeQty(Number(plus.dataset.plus), 1);

  const minus = e.target.closest("[data-minus]");
  if (minus) changeQty(Number(minus.dataset.minus), -1);

  const remove = e.target.closest("[data-remove]");
  if (remove) {
    cart = cart.filter(x => x.id !== Number(remove.dataset.remove));
    save();
    renderCart();
  }

  const cat = e.target.closest(".cat");
  if (cat) {
    document.querySelectorAll(".cat").forEach(b => b.classList.remove("active"));
    cat.classList.add("active");
    currentCategory = cat.dataset.category;
    renderProducts();
  }
});

$("searchInput").addEventListener("input", renderProducts);
$("cartBtn").addEventListener("click", openCart);
$("closeCart").addEventListener("click", closeCart);
$("cartOverlay").addEventListener("click", closeCart);

$("saveCart").addEventListener("click", () => {
  save();
  toast("تم حفظ السلة على هذا الجهاز");
});

$("orderWhatsApp").addEventListener("click", () => {
  if (!cart.length) {
    toast("أضف منتجًا إلى السلة أولًا");
    return;
  }
  const lines = cart.map(i => `- ${i.name} × ${i.qty} = ${money(i.qty * i.price)}`);
  const message = `مرحبًا، أريد طلب المنتجات التالية من لقطة:\n${lines.join("\n")}\n\nالإجمالي: ${money(cartTotal())}`;
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});

renderProducts();
renderCart();
