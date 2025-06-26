// ================================================================
// InsighTrack - Tracking Script para Checkout Shopify via CDN
// Versão: 1.0.5-cdn
// Autor: InsighTrack
// Data: 2025-06-26 21:41:59
// URL: https://femininsecret.github.io/tracking-cdn/femininsecret-tracking-cdn.js
// ================================================================

(function(){
  const CONFIG = {
    VERSION: '1.0.5-cdn',
    DEBUG: location.search.includes('debug_tracking'),
    FB_INDEX: '2',
    FB_DOMAIN: '.femininsecret.com',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    MAX_VALUE_LENGTH: 500,
    COOKIE_MAX_SIZE: 4090,
    IS_LOCALHOST: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
    LAST_UPDATE: '2025-06-26 21:41:59',
    AUTHOR: 'InsighTrack',
    GTM_ID: 'GTM-W5T85BS2',
    GTM_URL: 'https://www.googletagmanager.com',
    CDN_URL: 'https://femininsecret.github.io/tracking-cdn/'
  };

  // Verificar se já foi carregado
  if (window.insighTrackLoaded) {
    console.warn('[InsighTrack] Script já foi carregado anteriormente');
    return;
  }
  window.insighTrackLoaded = true;

  // ── Ferramentas de performance ──
  const PERF = {
    marks: new Map(),
    measures: new Map(),
    start(name) { this.marks.set(name, performance.now()); },
    end(name) {
      const start = this.marks.get(name);
      if (!start) return;
      const duration = performance.now() - start;
      this.marks.delete(name);
      this.measures.set(name, duration);
      if (CONFIG.DEBUG) console.log(`[InsighTrack] ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    },
    exposeMetrics() {
      const metrics = {};
      this.measures.forEach((d, n) => metrics[n] = Math.round(d));
      window.dataLayer?.push({
        event: 'insightrack_performance',
        tracking_version: CONFIG.VERSION,
        author: CONFIG.AUTHOR,
        cdn_url: CONFIG.CDN_URL,
        ...metrics
      });
    }
  };

  // ── Monitoramento e Métricas ──
  const METRICS = {
    errors: new Map(),
    
    trackError(error, context) {
      const key = `${context}_${error.name}`;
      const count = this.errors.get(key) || 0;
      this.errors.set(key, count + 1);
      
      if (count > 3) { // Reduzido para 3 no checkout
        window.dataLayer?.push({
          event: 'insightrack_error_threshold',
          error_context: context,
          error_type: error.name,
          error_count: count,
          tracking_version: CONFIG.VERSION,
          cdn_url: CONFIG.CDN_URL
        });
      }
    },
    
    expose() {
      const metrics = {
        errors: Object.fromEntries(this.errors),
        performance: Object.fromEntries(PERF.measures),
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null
      };
      
      window.dataLayer?.push({
        event: 'insightrack_metrics',
        tracking_version: CONFIG.VERSION,
        author: CONFIG.AUTHOR,
        cdn_url: CONFIG.CDN_URL,
        metrics
      });
    }
  };

  const debug = (...args) => CONFIG.DEBUG && console.log('[InsighTrack]', ...args);
  const logError = (err, ctx) => {
    console.error(`[InsighTrack Error] ${ctx}:`, err);
    METRICS.trackError(err, ctx);
    if (CONFIG.DEBUG) throw err;
  };

  // ── Função para hash de dados sensíveis ──
  async function hashSensitiveData(data) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      logError(e, 'hashSensitiveData');
      return '';
    }
  }

  // ── Sanitização ──
  const sanitize = v => {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'string') return String(v);
    return v
      .slice(0, CONFIG.MAX_VALUE_LENGTH)
      .replace(/[<>]/g, '')
      .replace(/[^\w\s\-\.,:;@\/\|\=&]/g, '');
  };

  // ── Cookie helpers ──
  const cookieRegexCache = new Map();
  function getCookieRegex(name) {
    if (!cookieRegexCache.has(name)) {
      cookieRegexCache.set(name, new RegExp(`^(?:.*;)?\\s*${name}\\s*=\\s*([^;]+)(?:.*)?$`));
    }
    return cookieRegexCache.get(name);
  }

  function getCookieSync(name) {
    try {
      const m = document.cookie.match(getCookieRegex(name));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) {
      logError(e, 'getCookieSync');
      return null;
    }
  }

  function setCookieSync(name, val, days) {
    try {
      const cur = getCookieSync(name);
      if (cur === val) return;
      
      const s = sanitize(val);
      const d = new Date(Date.now() + days * 86400000).toUTCString();
      
      let cookieString = `${name}=${encodeURIComponent(s)}; expires=${d}; path=/;`;
      
      if (!CONFIG.IS_LOCALHOST) {
        cookieString += ` SameSite=Lax; Secure; domain=${CONFIG.FB_DOMAIN};`;
        if (['_fbp', '_fbc', 'utmsTrack'].includes(name)) {
          cookieString = cookieString.replace('SameSite=Lax', 'SameSite=None');
        }
      }
      
      if (cookieString.length > CONFIG.COOKIE_MAX_SIZE) {
        console.warn(`[InsighTrack] Cookie ${name} excede tamanho máximo`);
        return;
      }
      
      document.cookie = cookieString;
    } catch (e) {
      logError(e, 'setCookieSync');
    }
  }

  // ── Detecção de dispositivo ──
  function getDeviceType() {
    if ('userAgentData' in navigator && navigator.userAgentData) {
      const { mobile } = navigator.userAgentData;
      if (mobile) return "Mobile";
      if (navigator.maxTouchPoints > 1 && screen.width >= 768) {
        return "Tablet";
      }
      return "Desktop";
    }
    
    const ua = navigator.userAgent || "";
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablet";
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|webOS|Opera M(obi|ini)/.test(ua)) {
      return "Mobile";
    }
    return "Desktop";
  }

  function getUserAgentPlatform() {
    if ('userAgentData' in navigator && navigator.userAgentData) {
      return navigator.userAgentData.platform || "Unknown";
    }
    
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
    if (/Windows NT/i.test(ua)) return "Windows";
    if (/Macintosh/i.test(ua)) return "Mac";
    if (/Linux/i.test(ua)) return "Linux";
    if (/CrOS/i.test(ua)) return "Chrome OS";
    return "Other";
  }

  function randomDigits(n) {
    try {
      if (crypto.randomUUID) {
        return crypto.randomUUID().replace(/\D/g, '').slice(0, n);
      }
      const arr = new Uint8Array(n);
      crypto.getRandomValues(arr);
      return Array.from(arr).map(b => (b % 10).toString()).join('');
    } catch (e) {
      logError(e, 'randomDigits');
      return '0'.repeat(n);
    }
  }

  // ── Bot Check ──
  PERF.start('init');
  const ua = navigator.userAgent.toLowerCase();
  const bots = [
    'googlebot','bingbot','slurp','duckduckbot','baiduspider',
    'yandexbot','sogou','exabot','facebookexternalhit','twitterbot',
    'linkedinbot', 'whatsapp', 'telegrambot'
  ];
  
  if (bots.some(b => ua.includes(b))) {
    debug('Bot detectado, parando tracking');
    return;
  }

  // ── STAGE 1: Inicialização Básica ──
  PERF.start('stage1');
  const params = new URLSearchParams(location.search);

  // uniqueId
  const mUid = document.cookie.match(/(^| )uniqueId=([^;]+)/);
  const uid = localStorage.getItem('uniqueId') || (mUid && mUid[2]) || (`${Math.random().toString(36).substr(2,9)}_${Date.now()}`);
  setCookieSync('uniqueId', uid, 365);
  try { localStorage.setItem('uniqueId', uid); } catch {}
  debug('uniqueId:', uid);

  // UTM term origin
  const origUtmTerm = params.get('utm_term');
  if (origUtmTerm) {
    setCookieSync('utm_term_origin', origUtmTerm, 90);
    try { localStorage.setItem('utm_term_origin', origUtmTerm); } catch {}
    debug('utm_term_origin saved:', origUtmTerm);
  }

  // Facebook Pixel
  const lsFbp = localStorage.getItem('_fbp');
  const cfFbp = getCookieSync('_fbp');
  if (!cfFbp) {
    const v = lsFbp || `fb.${CONFIG.FB_INDEX}.${Date.now()}.${randomDigits(18)}`;
    setCookieSync('_fbp', v, 730);
    try { localStorage.setItem('_fbp', v); } catch {}
    debug('_fbp created:', v);
  }

  // Facebook Click ID
  function getRawFbclid() {
    const m = location.search.match(/(?:\?|&)fbclid=([^&]+)/);
    return m ? m[1] : '';
  }
  const rawFb = getRawFbclid();
  if (rawFb) {
    const cfFbc = getCookieSync('_fbc');
    const old = cfFbc ? cfFbc.split('.').pop() : null;
    if (old !== rawFb) {
      const v = `fb.${CONFIG.FB_INDEX}.${Date.now()}.${rawFb}`;
      setCookieSync('_fbc', v, 730);
      try { localStorage.setItem('_fbc', v); } catch {}
      debug('_fbc created:', v);
    }
  }

  // Click IDs
  ['gclid','gbraid','wbraid','ttp','ttclid','gadsource'].forEach(k => {
    const v = params.get(k);
    if (v) {
      setCookieSync('_' + k, v, 90);
      try { localStorage.setItem('_' + k, v); } catch {}
      debug('_' + k + ' set:', v);
    }
  });

  debug('Stage 1 completed:', PERF.end('stage1'));

  // ── STAGE 2: Integração Shopify Analytics ──
  PERF.start('stage2');

  // Garantir dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // Expor funções globais
  window.insighTrack = {
    CONFIG,
    PERF,
    METRICS,
    getCookieSync,
    setCookieSync,
    getDeviceType,
    getUserAgentPlatform,
    debug,
    logError,
    version: CONFIG.VERSION
  };

  // ── CONFIGURAÇÕES ESTILO STAPE ──
  const sandbox_events = [
    'payment_info_submitted', 
    'checkout_started', 
    'checkout_shipping_info_submitted', 
    'checkout_contact_info_submitted', 
    'checkout_completed'
  ];

  const event_name = {
    'payment_info_submitted': 'add_payment_info_stape', 
    'checkout_started': 'begin_checkout_stape', 
    'checkout_shipping_info_submitted': 'add_shipping_info_stape', 
    'checkout_contact_info_submitted': 'add_contact_info_stape', 
    'checkout_completed': 'purchase_stape'
  };

  // Carregar GTM
  function loadGTM() {
    if (window.gtmLoaded) return;
    window.gtmLoaded = true;
    
    (function(w,d,s,l,i){
      w[l]=w[l]||[];
      w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;
      j.src=CONFIG.GTM_URL+'/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',CONFIG.GTM_ID);
    
    debug('GTM carregado:', CONFIG.GTM_ID);
  }

  // Detectar tipo de página
  function getPageType() {
    let path = window.initContext?.context?.document?.location?.pathname || location.pathname;
    
    if (path.includes('/collection')) return 'category';
    else if (path.includes('/product')) return 'product';
    else if (path.includes('/cart')) return 'basket';
    else if (path === '/') return 'home';
    else if (path.includes('thank_you') || path.includes('thank-you')) return 'purchase';  
    else if (path.includes('/checkout')) return 'basket';
    else return 'other';
  }

  // Função simplificada para parsear items (otimizada para checkout)
  function parseItems(event) {
    let items = [];

    // Checkout items
    if (event.data?.checkout?.lineItems) {
      items = event.data.checkout.lineItems.map(lineItem => ({
        item_id: lineItem.variant.product.id,
        item_sku: lineItem.variant.sku,
        item_variant: lineItem.variant.id,
        item_name: lineItem.variant.product.title,
        variant_name: lineItem.variant.title,
        item_category: lineItem.variant.product.type,
        item_brand: lineItem.variant.product.vendor,
        price: lineItem.variant.price.amount,
        quantity: lineItem.quantity,
        discount: lineItem.discountAllocations[0]?.amount?.amount || null
      }));
    }

    return items;
  }

  // Parsear dados do ecommerce
  function parseEcomParams(event) {
    let ecom = {};

    if (event?.data?.checkout?.totalPrice?.amount) {
      ecom.value = event.data.checkout.totalPrice.amount.toString();
      ecom.currency = event.data.checkout.totalPrice.currencyCode;
      ecom.cart_quantity = event.data.checkout.lineItems?.length || 0;
    }

    if (event.name === "checkout_completed") {
      ecom.transaction_id = event.data?.checkout?.order?.id;
      ecom.tax = event.data?.checkout?.totalTax?.amount;
      ecom.shipping = event.data?.checkout?.shippingLine?.price?.amount;
      ecom.coupon = event.data?.checkout?.discountApplications?.[0]?.title;
    }

    return ecom;
  }

  // Parsear dados do usuário
  function parseUserData(event) {
    const userData = {};

    // Dados básicos
    const billing = event.data?.checkout?.billingAddress;
    const shipping = event.data?.checkout?.shippingAddress;
    const customer = window.initContext?.data?.customer;

    userData.first_name = billing?.firstName || shipping?.firstName || customer?.firstName || null;
    userData.last_name = billing?.lastName || shipping?.lastName || customer?.lastName || null;
    userData.email = event.data?.checkout?.email || customer?.email || null;
    userData.phone = billing?.phone || shipping?.phone || customer?.phone || null;
    userData.city = billing?.city || shipping?.city || null;
    userData.country = billing?.countryCode || shipping?.countryCode || null;
    userData.customer_id = customer?.id || null;

    // ── DADOS INSIGHTRACK ──
    userData.unique_id = uid;
    userData.user_id = getCookieSync('user_id') || localStorage.getItem('user_id') || '';
    userData.device_type = getDeviceType();
    userData.platform = getUserAgentPlatform();
    userData.tracking_version = CONFIG.VERSION;
    userData.author = CONFIG.AUTHOR;

    return userData;
  }

  // ── INTEGRAÇÃO PRINCIPAL ──
  const href = window.initContext?.context?.document?.location?.href || location.href;
  
  if (href.includes("/checkouts") && window.analytics) {
    debug('Checkout detectado, inscrevendo em eventos do analytics');
    
    window.analytics.subscribe("all_standard_events", (event) => {
      try {
        if (!sandbox_events.includes(event.name)) return;

        const ecomm_pagetype = getPageType();
        const ecom = parseEcomParams(event);
        const userData = parseUserData(event);
        ecom.items = parseItems(event);

        const dataLayerObj = {
          'event': event_name[event.name],
          'user_data': userData,
          'ecommerce': ecom,
          'ecomm_pagetype': ecomm_pagetype,
          'actual_url': href,
          'tracking_version': CONFIG.VERSION,
          'author': CONFIG.AUTHOR,
          'cdn_url': CONFIG.CDN_URL,
          // ── DADOS UTM INSIGHTRACK ──
          'utm_data': {
            fbp: getCookieSync('_fbp') || '',
            fbc: getCookieSync('_fbc') || '',
            gclid: getCookieSync('_gclid') || '',
            gbraid: getCookieSync('_gbraid') || '',
            wbraid: getCookieSync('_wbraid') || '',
            gadsource: getCookieSync('_gadsource') || '',
            ttp: getCookieSync('_ttp') || '',
            ttclid: getCookieSync('_ttclid') || '',
            utms_track: getCookieSync('utmsTrack') || localStorage.getItem('utmsTrack') || '',
            utm_term_origin: getCookieSync('utm_term_origin') || localStorage.getItem('utm_term_origin') || '',
            unique_id: uid
          }
        };

        loadGTM();
        setTimeout(() => {
          window.dataLayer.push(dataLayerObj);
          debug('DataLayer enviado:', event.name, dataLayerObj);
        }, 500);
        
      } catch (error) {
        logError(error, 'analytics_event_handler');
      }
    });
    
    debug('Inscrição no analytics concluída');
  } else {
    debug('Não está no checkout ou analytics não disponível', {
      is_checkout: href.includes("/checkouts"),
      has_analytics: !!window.analytics
    });
  }

  // ── Finalização ──
  debug('Stage 2 concluído:', PERF.end('stage2'));
  PERF.end('init');
  PERF.exposeMetrics();
  METRICS.expose();

  // Event de inicialização
  window.dataLayer.push({
    event: 'insightrack_loaded',
    tracking_version: CONFIG.VERSION,
    author: CONFIG.AUTHOR,
    cdn_url: CONFIG.CDN_URL,
    checkout_mode: href.includes("/checkouts"),
    analytics_available: !!window.analytics,
    load_time: performance.now()
  });

  debug('InsighTrack CDN carregado com sucesso!', {
    version: CONFIG.VERSION,
    author: CONFIG.AUTHOR,
    cdn_url: CONFIG.CDN_URL,
    checkout_mode: href.includes("/checkouts"),
    analytics_available: !!window.analytics
  });

})();
