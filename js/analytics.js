/* ═══════════════════════════════════════════════════
   بن وقناد — Analytics
   ─ ضع كود GA ومعرّف Pixel هنا عند التسجيل
════════════════════════════════════════════════════ */

// ← Google Analytics Measurement ID (مثال: G-XXXXXXXXXX)
const GA_ID = '';

// ← Meta Pixel ID (مثال: 1234567890)
const META_PIXEL_ID = '';

/* ─── Google Analytics ──────────────────────────── */
(function initGA() {
  if (!GA_ID) return;
  const s = document.createElement('script');
  s.async = true;
  s.src   = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID, { send_page_view: false });
})();

/* ─── Meta Pixel ────────────────────────────────── */
(function initPixel() {
  if (!META_PIXEL_ID) return;
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){
      n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments);
    };
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', META_PIXEL_ID);
})();

/* ─── Core helper ───────────────────────────────── */
function _trackGA(event, params) {
  if (GA_ID && window.gtag) gtag('event', event, params || {});
}
function _trackFB(event, params) {
  if (META_PIXEL_ID && window.fbq) fbq('track', event, params || {});
}

/* ─── Public tracking functions ─────────────────── */

/** زيارة الصفحة — يُستدعى تلقائياً */
function trackPageView(title) {
  _trackGA('page_view', { page_title: title || document.title });
  _trackFB('PageView');
}

/** إضافة منتج للسلة */
function trackAddToCart(product) {
  _trackGA('add_to_cart', {
    currency: 'KWD',
    value:    product.price,
    items:    [{ item_id: String(product.id), item_name: product.name, price: product.price }],
  });
  _trackFB('AddToCart', {
    currency:     'KWD',
    value:        product.price,
    content_ids:  [String(product.id)],
    content_name: product.name,
    content_type: 'product',
  });
}

/** فتح نموذج العنوان / بدء الطلب */
function trackBeginCheckout(total, cartItems) {
  const gaItems = (cartItems || []).map(i => ({
    item_id:   String(i.id),
    item_name: i.name,
    price:     i.price,
    quantity:  i.qty,
  }));
  _trackGA('begin_checkout', { currency: 'KWD', value: total, items: gaItems });
  _trackFB('InitiateCheckout', {
    currency:  'KWD',
    value:     total,
    num_items: (cartItems || []).reduce((s, i) => s + i.qty, 0),
  });
}

/** الدفع الناجح */
function trackPurchase(orderRef, total, cartItems, method) {
  const gaItems = (cartItems || []).map(i => ({
    item_id:   String(i.id),
    item_name: i.name,
    price:     i.price,
    quantity:  i.qty,
  }));
  _trackGA('purchase', {
    transaction_id: orderRef,
    currency:       'KWD',
    value:          total,
    payment_type:   method || 'unknown',
    items:          gaItems,
  });
  _trackFB('Purchase', {
    currency:    'KWD',
    value:       total,
    content_ids: gaItems.map(i => i.item_id),
    content_type:'product',
  });
}

/* ── Auto page view on load ── */
window.addEventListener('load', () => trackPageView());
