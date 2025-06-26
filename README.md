# InsighTrack - CDN de Tracking

CDN personalizado para scripts de tracking da InsighTrack.

## 🚀 URLs Disponíveis:

### Produção:
```
https://femininsecret.github.io/tracking-cdn/femininsecret-tracking-cdn.js
```

### Com Cache Busting:
```
https://femininsecret.github.io/tracking-cdn/femininsecret-tracking-cdn.js?v=1.0.5-cdn
```

## 📋 Implementação no Shopify:

```html
<script>
window.analytics = analytics;
window.initContext = init;

fetch('https://femininsecret.github.io/tracking-cdn/femininsecret-tracking-cdn.js?v=1.0.5-cdn')
  .then(response => response.text())
  .then(scriptText => {
      const scriptElement = document.createElement('script');
      scriptElement.textContent = scriptText;
      document.head.appendChild(scriptElement);
  })
  .catch(error => {
      console.error('[InsighTrack] Erro ao carregar CDN:', error);
  });
</script>
```

## 🔧 Funcionalidades:

- ✅ Tracking avançado de UTMs
- ✅ Integração com Shopify Analytics
- ✅ Compatibilidade com Stape
- ✅ Sistema de retry e fallback
- ✅ LGPD/GDPR compliance
- ✅ Performance monitoring

## 📊 Debug:

Adicione `?debug_tracking=1` na URL para ver logs detalhados.

## 📝 Changelog:

### v1.0.5-cdn (2025-06-26)
- Implementação inicial CDN
- Integração com GitHub Pages
- Otimizações para checkout

---
**Desenvolvido por:** InsighTrack  
**Última atualização:** 2025-06-26 21:41:59
