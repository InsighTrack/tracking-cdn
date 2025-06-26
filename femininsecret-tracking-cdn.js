const GTM_ID = 'GTM-W5T85BS2'; //from settings tag
const GTM_URL = 'https://www.googletagmanager.com'; //from settings tag

const sandbox_events = ['payment_info_submitted', 'checkout_started', 'checkout_shipping_info_submitted', 'checkout_contact_info_submitted', 'checkout_completed'];

const event_name = {
  'payment_info_submitted': 'add_payment_info_stape', 
  'checkout_started': 'begin_checkout_stape', 
  'checkout_shipping_info_submitted': 'add_shipping_info_stape', 
  'checkout_contact_info_submitted': 'add_contact_info_stape', 
  'checkout_completed': 'purchase_stape'
};

const href = window.initContext?.context?.document?.location?.href;
if (href.includes("/checkouts")) {

    window.analytics.subscribe("all_standard_events", (event) => {
        let ecomm_pagetype = getPageType();
        let ecom = parseEcomParams(event);
        let userData = parseUserData(event);
        ecom.items = parseItems(event);

      const marketData =
        event.data?.checkout?.localization?.market ??
        event.data?.localization?.market ?? null;
      const marketId = marketData?.id?.split('/').pop() ?? null;
      const marketHandle = marketData?.handle ?? null;
      function dataLayerPushInFrame() {
        dataLayer = window.dataLayer || [];

        const dataLayerObj = {
          'event': event_name[event.name],
          'user_data': userData,
          'ecommerce': ecom,
          'ecomm_pagetype': ecomm_pagetype,
          'actual_url': href,
        };
        if (marketId) dataLayerObj.market_id = marketId;
        if (marketHandle) dataLayerObj.market_handle = marketHandle;
        dataLayer.push(dataLayerObj);
      }

        if(sandbox_events.includes(event.name)){
            loadGTM();
            setTimeout(() => {
                dataLayerPushInFrame();
            }, 500);
        }
    });
}

function getPageType() {

  let path = window.initContext?.context?.document?.location?.pathname;
  
  if (path.includes('/collection')) { return 'category'; }
  else if (path.includes('/product')) { return 'product'; }
  else if (path.includes('/cart')) { return 'basket'; }
  else if (path === '/') { return 'home'; }
  else if (path.includes('thank_you') || path.includes('thank-you')) { return 'purchase'; }  
  else if (path.includes('/checkout')) { return 'basket'; }
  else { return 'other'; }

}

function loadGTM() {
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-W5T85BS2');
}


function parseItems(event) {

  let items = [];

  if (event.data?.checkout?.lineItems) {
    for (let i = 0; i < event.data.checkout.lineItems.length; i++) {
      const lineItem = event.data.checkout.lineItems[i];
      const sellingPlanAllocation = lineItem.sellingPlanAllocation;

      const item = {
        item_id: lineItem.variant.product.id,
        item_sku: lineItem.variant.sku,
        item_variant: lineItem.variant.id,
        item_name: lineItem.variant.product.title,
        variant_name: lineItem.variant.title,
        item_category: lineItem.variant.product.type,
        item_brand: lineItem.variant.product.vendor,
        item_url: lineItem.variant.product?.url,
        price: lineItem.variant.price.amount,
        imageURL: lineItem?.variant?.image?.src,
        discount: lineItem.discountAllocations[0]?.amount?.amount || null,
        quantity: lineItem.quantity,
      };

      if (sellingPlanAllocation && sellingPlanAllocation.sellingPlan?.id) {
        const { id, name } = sellingPlanAllocation.sellingPlan;
        if (id) {
          const sellingPlanId = id.split('/').pop();
          if (sellingPlanId) {
            item.item_selling_plan_id = sellingPlanId;
          }
        }
        if (name) {
          const sellingPlanName = name || null;
          if (sellingPlanName) {
            item.item_selling_plan_name = sellingPlanName;
          }
        }
      }

      items.push(item);
    }
  }

  if (event.data?.cartLine?.merchandise) {
    items.push({
      'item_id': event.data.cartLine.merchandise.product.id,
      'item_sku': event.data.cartLine.merchandise.sku,
      'item_variant': event.data.cartLine.merchandise.id,
      'item_name': event.data.cartLine.merchandise.product.title,
      'variant_name': event.data.cartLine.merchandise.title,
      'item_category': event.data.cartLine.merchandise.product.type,
      'item_brand': event.data.cartLine.merchandise.product.vendor,
      'item_url': event.data.cartLine.merchandise.product?.url,
      'price': event.data.cartLine.merchandise.price.amount,
      'imageURL': event.data.cartLine.merchandise?.image?.src,
      'quantity': event.data.cartLine.quantity
    });
  }

  if (event.data?.productVariant) {
    items.push({
      'item_id': event.data.productVariant.product.id,
      'item_sku': event.data.productVariant.sku,
      'item_variant': event.data.productVariant.id,
      'item_name': event.data.productVariant.product.title,
      'variant_name': event.data.productVariant.title,      
      'item_category': event.data.productVariant.product.type,
      'price': event.data.productVariant.price.amount,
      'item_brand': event.data.productVariant.product.vendor,
      'imageURL': event.data.productVariant?.image?.src,
      'item_url': event.data.productVariant?.product?.url,
      'quantity': '1'
    });
    console.log(items);
  }

  if (event.data?.collection?.productVariants) {
    let maxItems = Math.min(10, event.data.collection.productVariants.length);
    for (let i = 0; i < maxItems; i++) {
      const variant = event.data.collection.productVariants[i];
      items.push({
        item_id: variant.product.id,
        item_sku: variant.sku,
        item_variant: variant.id,
        item_name: variant.product.title,
        variant_name: variant.title,
        item_category: variant.product.type,
        item_brand: variant.product.vendor,
        price: variant.price.amount,
        imageURL: variant?.image?.src,
        item_url: variant?.product?.url,
        index: i + 1,
      });
    }
  }

  // Parse search result product variants
  if (event.data?.searchResult?.productVariants) {
    const maxItems = Math.min(10, event.data.searchResult.productVariants.length);
    for (let i = 0; i < maxItems; i++) {
      const variant = event.data.searchResult.productVariants[i];
      items.push({
        item_id: variant.product.id,
        item_sku: variant.sku,
        item_variant: variant.id,
        item_name: variant.product.title,
        variant_name: variant.title,
        item_category: variant.product.type,
        item_brand: variant.product.vendor,
        price: variant.price.amount,
        imageURL: variant?.image?.src,
        item_url: variant?.product?.url,
        index: i + 1,
      });
    }
  }

  if (event.data?.cart?.lines) {
    for (let i = 0; i < event.data.cart.lines.length; i++) {
      const line = event.data.cart.lines[i];
      items.push({
        item_id: line.merchandise.product.id,
        item_sku: line.merchandise.sku,
        item_variant: line.merchandise.id,
        item_name: line.merchandise.product.title,
        variant_name: line.merchandise.title,
        item_category: line.merchandise.product.type,
        item_brand: line.merchandise.product.vendor,
        item_url: line.merchandise?.product?.url,
        price: line.merchandise.price.amount,
        imageURL: line.merchandise?.image?.src,
        quantity: line.quantity,
      });
    }
  }

  return items;
}



function parseEcomParams(event) {
    
  let ecom = {};

  if (event?.data?.checkout?.totalPrice?.hasOwnProperty('amount')) {
    ecom.value = event?.data?.checkout?.totalPrice?.amount?.toString();
    ecom.cart_total = event?.data?.checkout?.totalPrice?.amount?.toString();
    ecom.currency = event?.data?.checkout?.totalPrice?.currencyCode;
    ecom.cart_quantity = event?.data?.checkout?.lineItems?.length;
  }

  if (event.name == "checkout_completed") {
    ecom.tax = event?.data?.checkout?.totalTax?.amount;
    ecom.shipping = event?.data?.checkout?.shippingLine?.price?.amount;
    ecom.transaction_id = event?.data?.checkout?.order?.id;
    ecom.coupon = event?.data?.checkout?.discountApplications[0]?.title;
    ecom.discount = event?.data?.checkout?.discountApplications[0]?.title;
    ecom.discount_amount = event?.data?.checkout?.discountApplications[0]?.value?.amount;
    ecom.discount_percentage = event?.data?.checkout?.discountApplications[0]?.value?.percentage;
    ecom.sub_total = event?.data?.checkout?.subtotalPrice?.amount;
  }

  if (event.name == "collection_viewed") {
    ecom.collection_id = event?.data?.collection?.id;
    ecom.item_list_name = event?.data?.collection?.title;
    ecom.currency = event?.data?.collection?.productVariants[0]?.price?.currencyCode;
  }

  if (event.name == "search_submitted") {
    ecom.search_term = event?.data?.searchResult?.query;
    ecom.currency = event?.data?.searchResult?.productVariants[0]?.price?.currencyCode;
  }

  if (event.name == "cart_viewed") {
    ecom.value = event?.data?.cart?.cost?.totalAmount?.amount?.toString();
    ecom.currency = event?.data?.cart?.cost?.totalAmount?.currencyCode;
  }

  if (event.name == "product_viewed") {
    ecom.value = event?.data?.productVariant?.price?.amount?.toString();
    ecom.currency = event?.data?.productVariant?.price?.currencyCode;
  }

  if (event.name == "product_added_to_cart") {
    ecom.value = (event?.data?.cartLine?.cost?.totalAmount?.amount * 1).toFixed(2);
    ecom.currency = event?.data?.cartLine?.cost?.totalAmount?.currencyCode;
  }

  if (event.name == "product_removed_from_cart") {
    ecom.value = (event?.data?.cartLine?.cost?.totalAmount?.amount*1).toFixed(2);
    ecom.currency = event?.data?.cartLine?.cost?.totalAmount?.currencyCode;
  }

  return ecom;

};



function parseUserData(event) {
  let userData = {};

  userData.first_name = event.data?.checkout?.billingAddress?.firstName ? event.data.checkout.billingAddress.firstName : event.data?.checkout?.shippingAddress?.firstName ? event.data.checkout.shippingAddress.firstName : window.initContext?.data?.customer?.firstName ? window.initContext.data.customer.firstName : null;
  userData.last_name = event.data?.checkout?.billingAddress?.lastName ? event.data.checkout.billingAddress.lastName : event.data?.checkout?.shippingAddress?.lastName ? event.data.checkout.shippingAddress.lastName : window.initContext?.data?.customer?.lastName ? window.initContext.data.customer.lastName : null;
  userData.email = event.data?.checkout?.email ? event.data.checkout.email : window.initContext?.data?.customer?.email ? window.initContext.data.customer.email : null;
  userData.phone = event.data?.checkout?.billingAddress?.phone ? event.data.checkout.billingAddress.phone : event.data?.checkout?.shippingAddress?.phone ? event.data.checkout.shippingAddress.phone : window.initContext?.data?.customer?.phone ? window.initContext.data.customer.phone : null;
  userData.city = event.data?.checkout?.billingAddress?.city ? event.data.checkout.billingAddress.city : event.data?.checkout?.shippingAddress?.city ? event.data.checkout.shippingAddress.city : null;
  userData.country = event.data?.checkout?.billingAddress?.countryCode ? event.data.checkout.billingAddress.countryCode : event.data?.checkout?.shippingAddress?.countryCode ? event.data.checkout.shippingAddress.countryCode : null;
  userData.zip = event.data?.checkout?.billingAddress?.zip ? event.data.checkout.billingAddress.zip : event.data?.checkout?.shippingAddress?.zip ? event.data.checkout.shippingAddress.zip : null;
  userData.region = event.data?.checkout?.billingAddress?.provinceCode ? event.data.checkout.billingAddress.provinceCode : event.data?.checkout?.shippingAddress?.provinceCode ? event.data.checkout.shippingAddress.provinceCode : null;
  userData.street = event.data?.checkout?.billingAddress?.address1 ? event.data.checkout.billingAddress.address1 : event.data?.checkout?.shippingAddress?.address1 ? event.data.checkout.shippingAddress.address1 : null;
  userData.customer_id = window.initContext?.data?.customer?.id ? window.initContext.data.customer.id : null;
  // userData.lifetime_orders = window.initContext?.data?.customer?.ordersCount ? window.initContext.data.customer.ordersCount : 0;
  userData.new_customer = event?.data?.checkout?.order?.customer?.isFirstOrder;

  return userData;
}
