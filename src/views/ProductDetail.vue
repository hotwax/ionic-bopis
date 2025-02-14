<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/catalog" />
        <ion-title>{{ translate("Product details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="Object.keys(product).length > 0">
        <div class="product-section">
          
          <section class="product-image">
            <DxpShopifyImg :src="currentVariant.mainImageUrl" />
          </section>
  
          <section class="product-info">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ currentVariant.brandName }}</p>
                <h1>{{ getProductIdentificationValue(productIdentificationPref.primaryId, currentVariant) }}</h1>
                <h2>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, currentVariant) }}</h2>
              </ion-label>
              <!-- Price is given undefined to $n funtction on first render, hence, conditional rendering with empty string -->
              <ion-note slot="end">{{ currentVariant.LIST_PRICE_PURCHASE_USD_STORE_GROUP_price ? $n(currentVariant.LIST_PRICE_PURCHASE_USD_STORE_GROUP_price, 'currency', currency ) : '' }}</ion-note>
            </ion-item>
  
            <ion-list v-if="selectedColor">
              <ion-list-header>{{ translate("Colors") }}</ion-list-header>
              <ion-item lines="none">
                <ion-row>
                  <ion-chip :outline="selectedColor !== colorFeature" :key="colorFeature" v-for="colorFeature in Object.keys(features)" @click="selectedColor !== colorFeature && applyFeature(colorFeature, 'color')">
                    <ion-label class="ion-text-wrap">{{ colorFeature }}</ion-label>
                  </ion-chip>
                </ion-row>
              </ion-item>
            </ion-list>
  
            <ion-list v-if="selectedSize">
              <ion-list-header>{{ translate("Sizes") }} </ion-list-header>
              <ion-item lines="none">
                <ion-row>
                  <ion-chip :outline="selectedSize !== sizeFeature" :key="sizeFeature" v-for="sizeFeature in features[selectedColor]" @click="selectedSize !== sizeFeature && applyFeature(sizeFeature, 'size')">
                    <ion-label class="ion-text-wrap">{{ sizeFeature }}</ion-label>
                  </ion-chip>
                </ion-row>
              </ion-item>
            </ion-list>
            <div>
              <ion-segment :value="selectedSegment">
                <ion-segment-button value="inStore" @click="selectedSegment = 'inStore'">
                  <ion-label>In Store</ion-label>
                </ion-segment-button>
                <ion-segment-button value="otherLocations" @click="selectedSegment = 'otherLocations'">
                  <ion-label>Other Locations</ion-label>
                </ion-segment-button>
              </ion-segment>
  
              <ion-list v-if="selectedSegment === 'inStore'">
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Quantity on hand")}}</ion-label>
                  <ion-note slot="end">{{ getProductStock(currentVariant.productId).quantityOnHandTotal ?? '0' }}</ion-note>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Safety stock")}}</ion-label>
                  <ion-note slot="end">{{ getInventoryInformation(currentVariant.productId).minimumStock ?? '0' }}</ion-note>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Order reservations")}}</ion-label>
                  <ion-note slot="end">{{ getInventoryInformation(currentVariant.productId).reservedQuantity ?? '0' }}</ion-note>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">{{ translate("Available to promise")}}</ion-label>
                  <ion-badge color="success" slot="end">{{ getInventoryInformation(currentVariant.productId).onlineAtp ?? '0' }}</ion-badge>
                </ion-item>
              </ion-list>
  
              <ion-list v-if="selectedSegment === 'otherLocations'"> 
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Other stores")}}</ion-label>
                  <ion-button @click="getOtherStoresInventoryDetails()" fill="outline">{{ translate('ATP', { count: otherStoresInventory}) }}</ion-button>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">{{ translate("Warehouse")}}</ion-label>
                  <ion-note slot="end">{{ translate('ATP', { count: warehouseInventory}) }}</ion-note>
                </ion-item>
              </ion-list>
            </div>
          </section>
        </div>
        
        <div v-if="orders.length">
          <h3>{{ translate('order reservations at', { count: getInventoryInformation(currentVariant.productId).reservedQuantity ?? '0', store: currentFacility.facilityName }) }}</h3>
          <div class="reservation-section">
            <ion-card v-for="(order, index) in orders" :key="index"> 
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <h1>{{ order.customer.name }}</h1>
                  <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
                </ion-label>
                <ion-badge color="primary" slot="end">
                  {{ order.shipmentMethod.shipmentMethodTypeDesc ? order.shipmentMethod.shipmentMethodTypeDesc : order.shipmentMethod.shipmentMethodTypeId }}
                </ion-badge> 
              </ion-item>
              
              <ion-item lines="none"> 
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(order.currentItem.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(order.currentItem.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(order.currentItem.productId)) : order.currentItem.productId }}</h2>
                  <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(order.currentItem.productId)) }}</p>
                </ion-label>
                <ion-note slot="end">{{ translate(order.currentItem.quantity == 1 ? "unit" : "units", { item: order.currentItem.quantity }) }}</ion-note>
              </ion-item>
              <!-- other items -->
              <ion-list-header color="light" v-if="order.otherItems.length > 0">
                <ion-label>{{ translate("Other items")}}</ion-label>
              </ion-list-header>
              <ion-item lines="none" v-for="(item, index) in order.otherItems" :key="index" >
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap" >
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productId }}</h2>
                  <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>
                <ion-note slot="end">{{ translate(item.quantity == 1 ? "unit" : "units", { item: item.quantity }) }}</ion-note>
              </ion-item>
            </ion-card>
          </div>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonThumbnail,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { StockService } from '@/services/StockService'
import { getFeature, showToast } from "@/utils";
import { hasError } from '@/adapter'
import { sortSizes } from '@/apparel-sorter';
import OtherStoresInventoryModal from "./OtherStoresInventoryModal.vue";
import { DxpShopifyImg, getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components";
import logger from "@/logger";

export default defineComponent({
  name: "ProductDetail",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonPage,
    IonRow,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonThumbnail,
    IonToolbar,
    DxpShopifyImg
  },
  data() {
    return {
      selectedColor: '',
      selectedSize: '',
      features: [] as any,
      currentVariant: {} as any,
      currentStoreInventory: 0,
      otherStoresInventory: 0,
      warehouseInventory: 0,
      otherStoresInventoryDetails: [] as any,
      selectedSegment: 'inStore',
      queryString: ''
    }
  },
  computed: {
    ...mapGetters({
      product: "product/getCurrent",
      currency: 'user/getCurrency',
      getProductStock: 'stock/getProductStock',
      getInventoryInformation: 'stock/getInventoryInformation',
      orders: 'order/getOrders',
      getProduct: 'product/getProduct',
    }),
  },
  async beforeMount() {
    await this.store.dispatch('product/setCurrent', { productId: this.$route.params.productId })
    if (this.product.variants) {
      this.getFeatures()
      await this.updateVariant()
    }
  },
  methods: {
    //For fetching all the orders for this product & facility.
    async getOrderDetails() {
      await this.store.dispatch("order/getOrderDetails", { viewSize: 200, facilityId: this.currentFacility?.facilityId, productId: this.currentVariant.productId });
    },
    async applyFeature(feature: string, type: string) {
      if(type === 'color') this.selectedColor = feature;
      else if(type === 'size') this.selectedSize = feature
      await this.updateVariant();
    },
    getFeatures() {
      const features = {} as any
      this.product.variants.map((variant: any) => {
        const size = getFeature(variant.featureHierarchy, '1/SIZE/');
        const color = getFeature(variant.featureHierarchy, '1/COLOR/');
        if (!features[color]) features[color] = [size];
        else if(!features[color].includes(size)) features[color].push(size);
      });

      Object.keys(features).forEach((color) => this.features[color] = sortSizes(features[color]))

      this.selectedColor = Object.keys(this.features)[0];
      this.selectedSize = this.features[this.selectedColor][0];
    },
    async updateVariant() {
      let variant;
      if(this.selectedColor || this.selectedSize) {
        variant = this.product.variants.find((variant: any) => {
          const hasSize = getFeature(variant.featureHierarchy, '1/SIZE/') === this.selectedSize;
          const hasColor = getFeature(variant.featureHierarchy, '1/COLOR/') === this.selectedColor;
          return hasSize && hasColor;
        })

        // if the selected size is not available for that color, default it to the first size available
        if(!variant) {
          this.selectedSize = this.features[this.selectedColor][0];
          variant = this.product.variants.find((variant: any) => getFeature(variant.featureHierarchy, '1/SIZE/') === this.selectedSize)
          showToast(translate("Selected variant not available"));
        }
      }
      
      // if the variant does not have color or size as features
      this.currentVariant = variant || this.product.variants[0];
      await this.checkInventory();
      await this.getOrderDetails();
      await this.store.dispatch('stock/fetchStock', { productId: this.currentVariant.productId })
      await this.store.dispatch('stock/fetchInventoryCount', { productId: this.currentVariant.productId });
      await this.store.dispatch('stock/fetchReservedQuantity', { productId: this.currentVariant.productId });
    },
    async checkInventory() {
      this.currentStoreInventory = this.otherStoresInventory = this.warehouseInventory = 0
      this.otherStoresInventoryDetails = []

      try {
        const resp: any = await StockService.checkInventory({
          "filters": { 
            "productId": this.currentVariant.productId,
            "facilityTypeId_fld0_value": 'WAREHOUSE',
            "facilityTypeId_fld0_op": 'equals',
            "facilityTypeId_fld0_grp": '1',
            "facilityTypeId_fld1_value": 'RETAIL_STORE',
            "facilityTypeId_fld1_op": 'equals',
            "facilityTypeId_fld1_grp": '2'
          },
          "fieldsToSelect": ["productId", "atp", "facilityName", "facilityId", "facilityTypeId"],
        });

        if (resp.status === 200 && !hasError(resp) && resp.data.docs.length) {
          resp.data.docs.map((storeInventory: any) => {
            if(storeInventory.atp) {
              const isCurrentStore = storeInventory.facilityId === this.currentFacility?.facilityId;
              if (isCurrentStore) this.currentStoreInventory = storeInventory.atp;
              if (storeInventory.facilityTypeId === 'WAREHOUSE') {
                this.warehouseInventory += storeInventory.atp
              } else if (!isCurrentStore) {
                // Only add to list if it is not a current store
                this.otherStoresInventoryDetails.push({ facilityName: storeInventory.facilityName, stock: storeInventory.atp, facilityId: storeInventory.facilityId })
                this.otherStoresInventory += storeInventory.atp
              }
            }
          })
        }
      } catch (error) {
        logger.error(error)
        showToast(translate("Something went wrong"));
      }
    },
    async getOtherStoresInventoryDetails() {
      const otherStoresInventoryModal = await modalController.create({
        component: OtherStoresInventoryModal,
        componentProps: { otherStoresInventory: this.otherStoresInventoryDetails }
      });
      return otherStoresInventoryModal.present();
    }
  },
  setup() {
    const store = useStore();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      currentFacility,
      getProductIdentificationValue,
      productIdentificationPref,
      store,
      translate
    }
  }
});
</script>

<style scoped>
.product-image {
  text-align: center;
}

.reservation-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* gap: 5px; */
}

.product-section {
  display: flex;
  flex-wrap: wrap;
  max-width: 1042px;
  margin: auto;
}

.product-image {
  flex: 1 1 300px;
}

.product-info {
  flex: 2 1 360px;
}

@media (min-width: 720px) {
  main {
    padding: var(--spacer-sm);
  }
}
</style>
 
