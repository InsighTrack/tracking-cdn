// ================================================================
// InsighTrack - Pixel Shopify Checkout (Versão Corrigida)
// Data: 2025-06-26 22:57:09
// ================================================================

// Verificar se estamos no ambiente correto
if (typeof analytics === 'undefined' || typeof init === 'undefined') {
  console.error('[InsighTrack] analytics ou init não disponíveis - certifique-se de estar no checkout');
} else {
  // Configurar contexto global
  window.analytics = analytics;
  window.initContext = init;
  
  // Debug inicial
  const isDebug = location.search.includes('debug_tracking');
  if (isDebug) {
    console.log('[InsighTrack] Contexto disponível:', {
      analytics: !!window.analytics,
      initContext: !!window.initContext,
      checkout_url: location.href
    });
  }

  // Função para carregar script com múltiplas tentativas
  function loadInsighTrackScript() {
    const urls = [
      'https://femininsecret.github.io/tracking-cdn/femininsecret-tracking-cdn.js?v=1.0.5-final&t=' + Date.now(),
      'https://insightrack.github.io/tracking-cdn/femininsecret-tracking-cdn.js?v=1.0.5-final&t=' + Date.now()
    ];
    
    let currentUrlIndex = 0;
    
    function tryLoadScript() {
      if (currentUrlIndex >= urls.length) {
        console.error('[InsighTrack] Falha ao carregar de todas as URLs CDN');
        loadFallbackScript();
        return;
      }
      
      const url = urls[currentUrlIndex];
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.text();
        })
        .then(scriptText => {
          const scriptElement = document.createElement('script');
          scriptElement.textContent = scriptText;
          document.head.appendChild(scriptElement);
          
          if (isDebug) {
            console.log('[InsighTrack] Script carregado com sucesso de:', url);
          }
          
          // Verificar se carregou corretamente
          setTimeout(() => {
            if (window.insighTrackLoaded) {
              console.log('[InsighTrack] Inicialização confirmada');
            } else {
              console.warn('[InsighTrack] Script carregou mas não inicializou');
            }
          }, 1000);
        })
        .catch(error => {
          console.warn(`[InsighTrack] Falha ao carregar de ${url}:`, error);
          currentUrlIndex++;
          tryLoadScript();
        });
    }
    
    tryLoadScript();
  }
  
  // Script de fallback caso o CDN falhe
  function loadFallbackScript() {
    console.warn('[InsighTrack] Usando script de fallback');
    
    const fallbackScript = document.createElement('script');
    fallbackScript.textContent = `
      (function(){
        if (window.insighTrackLoaded) return;
        window.insighTrackLoaded = true;
        
        const debug = (...args) => location.search.includes('debug_tracking') && console.log('[InsighTrack Fallback]', ...args);
        
        // Configurações básicas
        const GTM_ID = 'GTM-W5T85BS2';
        const sandbox_events = ['payment_info_submitted', 'checkout_started', 'checkout_shipping_info_submitted', 'checkout_contact_info_submitted', 'checkout_completed'];
        const event_name = {
          'payment_info_submitted': 'add_payment_info_stape', 
          'checkout_started': 'begin_checkout_stape', 
          'checkout_shipping_info_submitted': 'add_shipping_info_stape', 
          'checkout_contact_info_submitted': 'add_contact_info_stape', 
          'checkout_completed': 'purchase_stape'
        };
        
        // Verificar se estamos no checkout
        const href = window.initContext?.context?.document?.location?.href || location.href;
        if (!href.includes("/checkouts")) {
          debug('Não está no checkout, saindo');
          return;
        }
        
        if (!window.analytics) {
          debug('Analytics não disponível');
          return;
        }
        
        debug('Fallback inicializado, subscrevendo eventos');
        
        // Função para carregar GTM
        function loadGTM() {
          if (window.gtmLoaded) return;
          window.gtmLoaded = true;
          
          (function(w,d,s,l,i){
            w[l]=w[l]||[];
            w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;
            j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
            f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer',GTM_ID);
          
          debug('GTM carregado');
        }
        
        // Subscrever eventos
        window.analytics.subscribe("all_standard_events", (event) => {
          debug('Evento recebido:', event.name);
          
          if (!sandbox_events.includes(event.name)) {
            debug('Evento não está na lista sandbox, ignorando');
            return;
          }
          
          const dataLayerObj = {
            'event': event_name[event.name],
            'fallback_mode': true,
            'tracking_version': '1.0.5-fallback',
            'actual_url': href,
            'event_data': event.data || {},
            'timestamp': Date.now()
          };
          
          loadGTM();
          
          setTimeout(() => {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(dataLayerObj);
            debug('DataLayer enviado (fallback):', dataLayerObj);
          }, 500);
        });
        
        debug('Fallback setup completo');
      })();
    `;
    
    document.head.appendChild(fallbackScript);
  }
  
  // Iniciar carregamento
  loadInsighTrackScript();
}
