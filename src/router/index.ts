import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import store from '@/store'
import Tabs from '@/views/Tabs.vue'
import OrderDetail from '@/views/OrderDetail.vue'
import ProductDetail from '@/views/ProductDetail.vue'
import ShipToStoreOrders from '@/views/ShipToStoreOrders.vue'
import Notifications from '@/views/Notifications.vue'
import Shopify from '@/views/Shopify.vue'

import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@hotwax/dxp-components'

import 'vue-router'
import { DxpLogin, useAuthStore } from '@hotwax/dxp-components';
import { loader } from '@/utils/user';

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}

const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !store.getters['user/isAuthenticated']) {
    await loader.present('Authenticating')
    // TODO use authenticate() when support is there
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    loader.dismiss()
  }
  next()
};

const loginGuard = (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !to.query?.token && !to.query?.oms) {
    next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/orders'
  },
  {
    path: '/tabs',
    component: Tabs,
    children: [
      {
        path: '',
        redirect: '/orders'
      },
      {
        path: 'orders',
        component: () => import('@/views/Orders.vue'),
        meta: {
          permissionId: "APP_ORDERS_VIEW"
        }
      },
      {
        path: 'catalog',
        component: () => import('@/views/Catalog.vue'),
        meta: {
          permissionId: "APP_CATALOG_VIEW"
        }
      },
      {
        path: 'settings',
        component: () => import('@/views/Settings.vue')
      },
    ],
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: DxpLogin,
    beforeEnter: loginGuard
  },
  {
    path: "/orderdetail/:orderType/:orderId/:orderPartSeqId",
    name: "OrderDetail",
    component: OrderDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "APP_ORDER_DETAIL_VIEW"
    }
  },
  {
    path: "/product-detail/:productId",
    name: "ProductDetail",
    component: ProductDetail,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_PRODUCT_DETAIL_VIEW"
    }
  },
  {
    path: '/ship-to-store-orders',
    name: "ShipToStoreOrders",
    component: ShipToStoreOrders,
    beforeEnter: authGuard,
  },
  {
    path: '/notifications',
    name: "Notifications",
    component: Notifications,
    beforeEnter: authGuard,
  },
  {
    path: '/shopify',
    name: 'Shopify',
    component: Shopify
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from) => {
  if (to.meta.permissionId && !hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/tabs/settings";
    else {
      showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router
