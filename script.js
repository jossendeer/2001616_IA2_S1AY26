// Jossen Deer (2001616)
// Web Programming UM2
// Individual Assignment #2 - https://jossendeer.github.io/2001616_IA2_S1AY26/Codes/

/* ---------- Product Data With Categories ---------- */

const PRODUCTS = [
  { id:'p1', title:'ArcticFlow Classic Bottle 500ml', category:'bottles', descLong:'Stainless steel double-wall vacuum bottle. Keeps drinks hot up to 12 hours or cold up to 24. Leak-resistant lid and ergonomic handle. Made with recycled stainless components & BPA Free.', price:29.99, img:'../Assets/product1.jpg', colors:['Pink','Bronze','Silver','Black','Blue'] },
  { id:'p2', title:'ArcticFlow Travel Mug 350ml', category:'mugs', descLong:'Insulated travel mug with spill-proof flip lid. Fits most car cup holders. BPA-free and dishwasher safe. Ideal for morning commutes.', price:24.99, img:'../Assets/product2.jpg', colors:['Stainless','Cream','Black','Grey'] },
  { id:'p3', title:'ArcticFlow Double Layer Lunch Jar 700ml', category:'lunch', descLong:'Vacuum-insulated food jar for hot meals. Wide mouth for easy serving and cleaning. Includes divided layers for portions, a foldable spoon and BPA Free.', price:34.49, img:'../Assets/product3.jpg', colors:['Blue','Pink','Green'] },
  { id:'p4', title:'ArcticFlow 1L Expedition Bottle', category:'bottles', descLong:'Large 1L bottle for long hikes. Heavy-duty stainless steel with a reinforced cap and carabiner-ready handle. Keeps beverages cold on hot days and piping hot when needed plus as always, BPA Free.', price:39.99, img:'../Assets/product4.jpg', colors:['Navy Blue','Black','Black Chill'] },
  { id:'p5', title:'ArcticFlow Bento Lunch Container', category:'lunch', descLong:'Bento-style multi-compartment lunch container with insulation layer. Perfect for balanced meals, leak resistant, easy to carry and BPA Free.', price:42.99, img:'../Assets/product5.jpg', colors:['Clear','Lavender','Blue','Pink','Green'] },
  { id:'p6', title:'ArcticFlow Kids Bottle 500ml', category:'bottles', descLong:'Kid-friendly, BPA Free insulated bottle with playful patterns and easy-sip spout. Lightweight and durable for backpacks and school bags.', price:22.49, img:'../Assets/product6.jpg', colors:['Balloon Blue','Bear Black','Rocket Red','Grassy Green'] }
];

/* ---------- Storage keys ---------- */
const CART_KEY = 'arcticflow_cart_v3';
const USER_KEY = 'arcticflow_user_v1';
const ORDERS_KEY = 'arcticflow_orders_v1';
const COUPON_KEY = 'arcticflow_coupon_v1';

/* ---------- Notification system (inline) ---------- */
function notify(message, type='success', timeout=3500){
  let root = document.getElementById('notice-root');
  if(!root){
    root = document.createElement('div');
    root.id = 'notice-root';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  const node = document.createElement('div');
  node.className = `af-notice ${type}`;
  node.style = `
    margin:0.5rem auto; max-width:min(920px,calc(100% - 2rem));
    padding:0.8rem 1rem; border-radius:8px; box-shadow:0 8px 20px rgba(10,10,10,0.06);
    display:flex; justify-content:space-between; align-items:center;
    background:${type === 'error' ? '#fff3f2' : '#e8f9ef'}; color:${type === 'error' ? '#5b1f1b' : '#064e2a'};
  `;
  node.innerHTML = `<div style="flex:1">${message}</div><button aria-label="Close" style="margin-left:1rem;background:transparent;border:0;cursor:pointer">×</button>`;
  root.appendChild(node);
  node.querySelector('button').addEventListener('click', ()=> node.remove());
  setTimeout(()=> node.remove(), timeout);
}

/* ---------- Cart functions (supports variants) ---------- */
function loadCart(){
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : {};
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function addToCart(productId, qty=1, variant=null){
  const cart = loadCart();
  const key = variant ? `${productId}::${variant}` : productId;
  cart[key] = (cart[key] || 0) + qty;
  saveCart(cart);
  updateCartCount();
  notify('Added to cart', 'success', 2000);
}
function removeFromCart(key){
  const cart = loadCart();
  delete cart[key];
  saveCart(cart);
  updateCartCount();
  renderCartPage();
}
function setQuantity(key, qty){
  const cart = loadCart();
  if(qty <= 0) delete cart[key];
  else cart[key] = qty;
  saveCart(cart);
  updateCartCount();
  renderCartPage();
}

/* ---------- Totals: shipping & coupons ---------- */
/*
 shippingOpt can be:
  - 'standard' => $6
  - 'express' => $12
  - 'auto' or undefined => use $6 but free if subtotal >= 80
*/
function calculateTotals(cart, shippingOpt='standard'){
  // subtotal in cents
  let subtotalCents = 0;
  for(const key in cart){
    // key may be productId or productId::variant
    const productId = key.split('::')[0];
    const p = PRODUCTS.find(x => x.id === productId);
    if(!p) continue;
    const qty = cart[key];
    subtotalCents += Math.round(p.price * 100) * qty;
  }

  // coupon handling
  const coupon = localStorage.getItem(COUPON_KEY) || null;
  let discountCents = 0;
  if(coupon === 'ARCTIC10'){
    discountCents = Math.round(subtotalCents * 0.10);
  } else if(coupon === 'WELCOME5'){
    discountCents = 500; // $5
  }

  // shipping logic: free if subtotal (before discount) >= 80
  const subtotalBefore = subtotalCents / 100;
  let shipping = 6.00;
  if(shippingOpt === 'express') shipping = 12.00;
  // if subtotalBefore >= 80 => free shipping
  if(subtotalBefore >= 80) shipping = 0.00;

  // compute taxable amount after discount but shipping is taxable in our model (as earlier)
  const taxableCents = Math.max(0, subtotalCents - discountCents) + Math.round(shipping * 100);
  const taxCents = Math.round(taxableCents * 0.05);
  const totalCents = taxableCents + taxCents;

  return {
    subtotal: (subtotalCents / 100).toFixed(2),
    discount: (discountCents / 100).toFixed(2),
    shipping: shipping.toFixed(2),
    tax: (taxCents / 100).toFixed(2),
    total: (totalCents / 100).toFixed(2)
  };
}

/* ---------- Render products (supports search & category filter) ---------- */
function renderProducts(filter='all', searchTerm=''){
  const container = document.getElementById('products');
  if(!container) return;
  container.innerHTML = '';

  const term = (searchTerm || '').trim().toLowerCase();

  const items = PRODUCTS.filter(p => {
    const catOk = (filter === 'all') || (p.category === filter);
    const termOk = term === '' || (p.title + ' ' + p.descLong).toLowerCase().includes(term);
    return catOk && termOk;
  });

  if(items.length === 0){
    container.innerHTML = '<p class="muted">No products found.</p>';
    return;
  }

  // build product cards
  items.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.title}">
      <h4>${p.title}</h4>
      <p class="muted small">${p.descLong.length > 110 ? p.descLong.substring(0,110) + '…' : p.descLong}</p>
      <div class="card-row" style="margin-top:0.6rem;align-items:center">
        <div class="price">$${p.price.toFixed(2)}</div>
        <div>
          <button class="btn small outline" data-action="view" data-id="${p.id}">View</button>
          <button class="btn small primary" data-action="add" data-id="${p.id}">Add</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // event delegation for add/view
  container.onclick = (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if(action === 'add') addToCart(id, 1, null);
    if(action === 'view') window.location.href = `product.html?id=${encodeURIComponent(id)}`;
  };
}

/* ---------- Product detail renderer (dynamic colors, full image) ---------- */
function renderProductDetail(){
  const detail = document.getElementById('product-detail');
  if(!detail) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || PRODUCTS[0].id;
  const p = PRODUCTS.find(x => x.id === id) || PRODUCTS[0];

  const colorOptions = p.colors.map(c => `<option value="${c}">${c}</option>`).join('');

  detail.innerHTML = `
    <div class="product-card" style="align-items:flex-start;padding:1.2rem;">
      <img id="pd-img" src="${p.img}" alt="${p.title}" style="width:100%;height:auto;object-fit:contain;max-height:520px;margin-bottom:1rem;">
      <h2>${p.title}</h2>
      <p style="margin:0.6rem 0 1rem;line-height:1.6">${p.descLong}</p>
      <p class="price" style="font-size:1.3rem;margin-bottom:0.8rem">$${p.price.toFixed(2)}</p>

      <label for="pd-qty">Quantity</label>
      <input id="pd-qty" type="number" min="1" value="1" style="width:90px;margin-bottom:0.8rem">

      <label for="pd-color">Color</label>
      <select id="pd-color" style="margin-bottom:1rem">${colorOptions}</select>

      <div style="display:flex;gap:0.6rem">
        <button id="pd-add" class="btn primary">Add to Cart</button>
        <button id="pd-buy" class="btn outline">Buy Now</button>
      </div>
    </div>
  `;

  const pdAdd = document.getElementById('pd-add');
  const pdBuy = document.getElementById('pd-buy');
  if(pdAdd){
    pdAdd.addEventListener('click', () => {
      const qty = Math.max(1, parseInt(document.getElementById('pd-qty').value) || 1);
      const color = document.getElementById('pd-color').value;
      addToCart(p.id, qty, color);
    });
  }
  if(pdBuy){
    pdBuy.addEventListener('click', () => {
      const qty = Math.max(1, parseInt(document.getElementById('pd-qty').value) || 1);
      const color = document.getElementById('pd-color').value;
      addToCart(p.id, qty, color);
      // direct to checkout
      window.location.href = 'checkout.html';
    });
  }
}

/* ---------- Render Cart Page ---------- */
function renderCartPage(){
  const cartContainer = document.getElementById('cart-contents');
  if(!cartContainer) return;
  const cart = loadCart();
  cartContainer.innerHTML = '';

  const keys = Object.keys(cart);
  if(keys.length === 0){
    cartContainer.innerHTML = '<p>Your cart is empty.</p>';
    updateSummaryDisplays();
    return;
  }

  keys.forEach(key => {
    const qty = cart[key];
    const [productId, variant] = key.split('::');
    const p = PRODUCTS.find(x => x.id === productId);
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <img src="${p.img}" alt="${p.title}" style="width:84px;height:84px;object-fit:contain">
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${p.title}${variant ? ' — ' + variant : ''}</strong>
          <div>$${p.price.toFixed(2)}</div>
        </div>
        <div style="margin-top:0.6rem;display:flex;gap:0.6rem;align-items:center">
          <label class="small">Qty</label>
          <input type="number" class="cart-qty" data-key="${key}" value="${qty}" min="0" style="width:80px">
          <button class="btn outline remove-item" data-key="${key}">Remove</button>
        </div>
      </div>
    `;
    cartContainer.appendChild(row);
  });

  // attach listeners
  cartContainer.querySelectorAll('.cart-qty').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const k = e.target.dataset.key;
      const q = parseInt(e.target.value) || 0;
      setQuantity(k, q);
    });
  });
  cartContainer.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const k = e.target.dataset.key;
      if(confirm('Remove this item?')) removeFromCart(k);
    });
  });

  updateSummaryDisplays();
}

/* ---------- Summary Display (Cart & Checkout) ---------- */
function updateSummaryDisplays(){
  const cart = loadCart();
  // shipping option reading priority: cart page select -> checkout select -> default standard
  const shippingSelectCart = document.getElementById('shipping-select');
  const shippingSelectCo = document.getElementById('shipping-select-co');
  let shippingOpt = 'standard';
  if(shippingSelectCart) shippingOpt = (shippingSelectCart.value === 'express') ? 'express' : 'standard';
  else if(shippingSelectCo) shippingOpt = (shippingSelectCo.value === 'express') ? 'express' : 'standard';

  const totals = calculateTotals(cart, shippingOpt);

  // Cart page displays
  const subtotalEl = document.getElementById('subtotal');
  const discountEl = document.getElementById('discount');
  const shippingEl = document.getElementById('shipping-cost');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('total');

  if(subtotalEl) subtotalEl.textContent = totals.subtotal;
  if(discountEl) discountEl.textContent = totals.discount;
  if(shippingEl) shippingEl.textContent = totals.shipping;
  if(taxEl) taxEl.textContent = totals.tax;
  if(totalEl) totalEl.textContent = totals.total;

  // Checkout page displays
  const coSubtotal = document.getElementById('co-subtotal');
  const coDiscount = document.getElementById('co-discount');
  const coShipping = document.getElementById('co-shipping');
  const coTax = document.getElementById('co-tax');
  const coTotal = document.getElementById('co-total');

  if(coSubtotal) coSubtotal.textContent = totals.subtotal;
  if(coDiscount) coDiscount.textContent = totals.discount;
  if(coShipping) coShipping.textContent = totals.shipping;
  if(coTax) coTax.textContent = totals.tax;
  if(coTotal) coTotal.textContent = totals.total;

  // Checkout items list
  const checkoutItems = document.getElementById('checkout-items');
  if(checkoutItems){
    checkoutItems.innerHTML = '';
    if(Object.keys(cart).length === 0){
      checkoutItems.innerHTML = '<p>Your cart is empty.</p>';
    } else {
      for(const key in cart){
        const qty = cart[key];
        const [productId, variant] = key.split('::');
        const p = PRODUCTS.find(x => x.id === productId);
        checkoutItems.innerHTML += `<div>${p.title}${variant ? ' — ' + variant : ''} × ${qty} — $${(p.price * qty).toFixed(2)}</div>`;
      }
    }
  }

  // coupon info on cart page
  const couponInfo = document.getElementById('coupon-info');
  if(couponInfo){
    const code = localStorage.getItem(COUPON_KEY) || '';
    couponInfo.textContent = code ? `Applied coupon: ${code}` : 'No coupon applied';
  }
}

/* ---------- Coupons ---------- */
function applyCoupon(code){
  const normalized = code.trim().toUpperCase();
  if(normalized === 'ARCTIC10' || normalized === 'WELCOME5'){
    localStorage.setItem(COUPON_KEY, normalized);
    notify(`Coupon ${normalized} applied`, 'success');
    updateSummaryDisplays();
  } else {
    notify('Coupon not valid', 'error');
  }
}
function removeCoupon(){
  localStorage.removeItem(COUPON_KEY);
  notify('Coupon removed', 'success');
  updateSummaryDisplays();
}

/* ---------- Account & Orders ---------- */
function saveOrder(order){
  const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  all.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
}
function renderAccount(){
  const nameEl = document.getElementById('acc-name');
  const emailEl = document.getElementById('acc-email');
  const usernameEl = document.getElementById('acc-username');
  const ordersList = document.getElementById('orders-list');

  const raw = localStorage.getItem(USER_KEY);
  const user = raw ? JSON.parse(raw) : null;

  if(nameEl) nameEl.textContent = user ? `Name: ${user.fullname}` : 'Name: —';
  if(emailEl) emailEl.textContent = user ? `Email: ${user.email}` : 'Email: —';
  if(usernameEl) usernameEl.textContent = user ? `Username: ${user.username}` : 'Username: —';

  if(ordersList){
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    ordersList.innerHTML = '';
    if(orders.length === 0){
      ordersList.innerHTML = '<p class="muted">No previous orders.</p>';
    } else {
      orders.forEach(o => {
        const div = document.createElement('div');
        div.className = 'order-item';
        div.innerHTML = `<strong>Order ${o.id}</strong> — <span class="small muted">${o.date}</span><div>${o.items.map(it => `<div>${it}</div>`).join('')}</div><div class="small">Total: $${o.total}</div>`;
        ordersList.appendChild(div);
      });
    }
  }
}

/* ---------- Auth (Register/Login) ---------- */
function handleRegister(){
  const form = document.getElementById('register-form');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullname = form['fullname'].value.trim();
    const dob = form['dob'].value;
    const email = form['email'].value.trim();
    const username = form['username'].value.trim();
    const password = form['password'].value;

    const out = document.getElementById('register-messages');
    const messages = [];
    if(!fullname) messages.push('Full name required.');
    if(!dob) messages.push('DOB required.');
    if(!validateEmail(email)) messages.push('Valid email required.');
    if(!username) messages.push('Username required.');
    if(password.length < 6) messages.push('Password must be at least 6 characters.');

    if(messages.length){
      if(out){ out.style.color = 'red'; out.textContent = messages.join(' '); }
      else notify(messages.join(' '), 'error');
      return;
    }

    const user = { fullname, dob, email, username };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if(out){ out.style.color = 'green'; out.textContent = 'Registration successful. Redirecting...'; }
    notify('Registration saved. Redirecting to login...', 'success');
    setTimeout(()=> window.location.href = 'login.html', 800);
  });
}

function handleLogin(){
  const form = document.getElementById('login-form');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = form['username'].value.trim();
    const password = form['password'].value;

    const out = document.getElementById('login-error');
    const raw = localStorage.getItem(USER_KEY);
    if(!raw){
      if(out){ out.style.color = 'red'; out.textContent = 'No registered user found.'; }
      notify('No registered user found. Please register.', 'error');
      return;
    }
    const user = JSON.parse(raw);
    if(user.username !== username){
      if(out){ out.style.color = 'red'; out.textContent = 'Username not found.'; }
      notify('Username not found', 'error');
      return;
    }
    if(out){ out.style.color = 'green'; out.textContent = `Welcome back, ${user.fullname.split(' ')[0]}! Redirecting...`; }
    notify(`Welcome back, ${user.fullname.split(' ')[0]}`, 'success');
    setTimeout(()=> window.location.href = 'index.html', 700);
  });
}

/* ---------- Checkout (validate, save order) ---------- */
function handleCheckout(){
  const form = document.getElementById('checkout-form');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullname = form['fullname'].value.trim();
    const email = form['email'].value.trim();
    const address = form['address'].value.trim();
    // shipping select on checkout: expects value 'standard' or 'express'
    const shippingSelect = document.getElementById('shipping-select-co');
    const shippingOpt = shippingSelect ? shippingSelect.value : 'standard';
    const amount = parseFloat(form['amount'].value);

    const cart = loadCart();
    const totals = calculateTotals(cart, shippingOpt);
    const total = parseFloat(totals.total);

    const errors = [];
    if(!fullname) errors.push('Full name required.');
    if(!validateEmail(email)) errors.push('Valid email required.');
    if(!address) errors.push('Address required.');
    if(isNaN(amount) || amount < total) errors.push(`Amount must be at least $${total.toFixed(2)}.`);
    if(Object.keys(cart).length === 0) errors.push('Cart is empty.');

    if(errors.length){
      notify(errors.join(' '), 'error');
      return;
    }

    // Create order record and save
    const order = {
      id: 'ORD' + Date.now(),
      date: new Date().toLocaleString(),
      items: Object.keys(cart).map(k => {
        const qty = cart[k];
        const [productId, variant] = k.split('::');
        const p = PRODUCTS.find(x => x.id === productId);
        return `${p.title}${variant ? ' — ' + variant : ''} × ${qty} — $${(p.price * qty).toFixed(2)}`;
      }),
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      shippingAddress: address
    };
    saveOrder(order);
    notify('Order confirmed — thank you!', 'success', 4200);
    // Clear cart and coupon
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(COUPON_KEY);
    // small delay then go to account page to show order
    setTimeout(()=> window.location.href = 'account.html', 900);
  });

  // Cancel / Close UI
  document.getElementById('cancel')?.addEventListener('click', () => {
    if(confirm('Cancel checkout and return to cart?')) window.location.href = 'cart.html';
  });
  document.getElementById('close')?.addEventListener('click', () => {
    if(confirm('Close checkout?')) window.location.href = 'index.html';
  });
}

/* ---------- Utilities ---------- */
function validateEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function updateCartCount(){
  const cart = loadCart();
  const count = Object.values(cart).reduce((s,n)=>s+n,0);
  const el = document.getElementById('cart-count');
  if(el) el.textContent = count;
}

/* ---------- Init & Event wiring ---------- */
function init(){
  // set footer year(s)
  document.querySelectorAll('#year,#year2').forEach(el => { if(el) el.textContent = new Date().getFullYear(); });

  // initial renders
  // default category 'all'
  renderProducts('all', '');
  renderProductDetail();
  renderCartPage();
  renderAccount();
  updateCartCount();
  updateSummaryDisplays();

  // category buttons: All, Bottles, Lunch Containers, Mugs
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat; // expect 'all' | 'bottles' | 'lunch' | 'mugs'
      document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      // render with filter
      renderProducts(cat, document.getElementById('product-search')?.value || '');
    });
  });

  // search input
  const searchInput = document.getElementById('product-search');
  if(searchInput){
    searchInput.addEventListener('input', (e) => {
      const activeCat = document.querySelector('.cat-btn.active')?.dataset.cat || 'all';
      renderProducts(activeCat, e.target.value);
    });
  }

  // coupon apply/remove on cart page
  const applyBtn = document.getElementById('apply-coupon');
  if(applyBtn){
    applyBtn.addEventListener('click', () => {
      const code = (document.getElementById('coupon-input')?.value || document.getElementById('coupon')?.value || '').trim().toUpperCase();
      if(!code){
        notify('Enter a coupon code', 'error');
        return;
      }
      applyCoupon(code);
    });
  }
  const removeBtn = document.getElementById('remove-coupon');
  if(removeBtn) removeBtn.addEventListener('click', () => removeCoupon());

  // shipping select on cart and checkout pages -> update summary when changed
  const shippingSelect = document.getElementById('shipping-select');
  if(shippingSelect) shippingSelect.addEventListener('change', () => updateSummaryDisplays());
  const shippingSelectCo = document.getElementById('shipping-select-co');
  if(shippingSelectCo) shippingSelectCo.addEventListener('change', () => updateSummaryDisplays());

  // clear cart button
  document.getElementById('clear-cart')?.addEventListener('click', () => {
    if(confirm('Clear all items from cart?')) {
      localStorage.removeItem(CART_KEY);
      updateCartCount();
      renderCartPage();
      updateSummaryDisplays();
    }
  });

  // register/login/checkout handlers
  handleRegister();
  handleLogin();
  handleCheckout();

  // account logout button if present
  const logoutBtn = document.getElementById('logout-btn');
  if(logoutBtn){
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(USER_KEY);
      notify('Logged out', 'success');
      setTimeout(()=> location.reload(), 300);
    });
  }

  // when storage changes in other tabs, update UI
  window.addEventListener('storage', (e) => {
    if(!e.key) return;
    if([CART_KEY, COUPON_KEY, ORDERS_KEY, USER_KEY].some(k => e.key.includes(k))){
      renderCartPage();
      updateSummaryDisplays();
      renderAccount();
      updateCartCount();
    }
  });
}

/* Run init when DOM is ready (Event Listener #1) */
document.addEventListener('DOMContentLoaded', init);

/* END of script.js */

