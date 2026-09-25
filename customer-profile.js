(() => {
  'use strict';
  const KEY = 'loqataCustomer';
  const $ = id => document.getElementById(id);
  const clean = v => String(v || '').trim();

  function readProfile() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
    return { name: clean(p.name), phone: clean(p.phone), address: clean(p.address) };
  }

  function writeProfile(p) {
    const profile = { name: clean(p.name), phone: clean(p.phone), address: clean(p.address) };
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
      localStorage.setItem('loqataCustomerName', profile.name);
      localStorage.setItem('loqataCustomerPhone', profile.phone);
      localStorage.setItem('loqataCustomerAddress', profile.address);
      sessionStorage.setItem(KEY, JSON.stringify(profile));
    } catch (_) {}
    return profile;
  }

  function accountProfile() {
    return {
      name: clean($('accountName')?.value),
      phone: clean($('accountPhone')?.value),
      address: clean($('accountAddress')?.value)
    };
  }

  function fillCheckout() {
    const account = accountProfile();
    const stored = readProfile();
    const p = {
      name: account.name || stored.name,
      phone: account.phone || stored.phone,
      address: account.address || stored.address
    };
    if (p.name || p.phone || p.address) writeProfile(p);
    if ($('customerName')) $('customerName').value = p.name || '';
    if ($('customerPhone')) $('customerPhone').value = p.phone || '';
    if ($('customerAddress')) $('customerAddress').value = p.address || '';
  }

  function fillAccount() {
    const p = readProfile();
    if ($('accountName') && !$('accountName').value) $('accountName').value = p.name;
    if ($('accountPhone') && !$('accountPhone').value) $('accountPhone').value = p.phone;
    if ($('accountAddress') && !$('accountAddress').value) $('accountAddress').value = p.address;
  }

  function init() {
    fillAccount();

    // Capture submit before any older app handlers. Saving the profile no longer
    // depends on the large app.js finishing all of its initialization.
    $('accountForm')?.addEventListener('submit', () => {
      writeProfile(accountProfile());
      fillCheckout();
    }, true);

    ['accountName','accountPhone','accountAddress'].forEach(id => {
      $(id)?.addEventListener('change', () => writeProfile(accountProfile()), true);
    });

    // This is the actual button that opens checkout.
    $('orderWhatsApp')?.addEventListener('click', () => {
      writeProfile(accountProfile().name || accountProfile().phone || accountProfile().address ? accountProfile() : readProfile());
      // app.js opens the modal in the same click. Fill after that handler and again
      // on the next paint so no legacy checkout code can clear the fields.
      setTimeout(fillCheckout, 0);
      requestAnimationFrame(() => requestAnimationFrame(fillCheckout));
      setTimeout(fillCheckout, 150);
    }, true);

    // Also refill whenever checkout becomes visible, regardless of how it opened.
    const modal = $('checkoutModal');
    if (modal && window.MutationObserver) {
      new MutationObserver(() => { if (!modal.hidden) fillCheckout(); })
        .observe(modal, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
