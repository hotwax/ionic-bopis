<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.userLoginId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.partyName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>
      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>
      <section>
        <DxpOmsInstanceNavigator />
        <DxpFacilitySwitcher @updateFacility="updateFacility" />
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate("Re-route Fulfillment") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ translate("Order edit permissions") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Control what your customers are allowed to edit on their order when they are editing their order on Re-route Fulfillment.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowDeliveryMethodUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryMethodUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryMethodUpdate, $event.detail.checked)">{{ translate("Delivery method") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowDeliveryAddressUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryAddressUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryAddressUpdate, $event.detail.checked)">{{ translate("Delivery address") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowPickupUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowPickupUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowPickupUpdate, $event.detail.checked)">{{ translate("Pick up location") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <!-- <p>Uploading order cancelations to Shopify is currently disabled. Order cancelations in HotWax will not be synced to Shopify.</p> -->
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowCancel).length == 0" :checked="rerouteFulfillmentConfig.allowCancel.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowCancel, $event.detail.checked)">{{ translate("Cancel order before fulfillment") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.orderItemSplit).length == 0" :checked="rerouteFulfillmentConfig.orderItemSplit.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.orderItemSplit, $event.detail.checked)">{{ translate("Order item split") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-label v-if="Object.keys(getShipmentMethodConfig()).length > 0">
              <p class="overline">{{ translate('Shipment method') }}</p>
              {{ getShipmentMethodConfig()?.shipmentMethodDesc }}
              <p>{{ getShipmentMethodConfig().carrierName }}</p>
            </ion-label>
            <ion-label v-else>
              {{ translate('Shipment method') }}
            </ion-label>
            <ion-button slot="end" fill="outline" color="dark" :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.shippingMethod).length == 0" @click="openEditShipmentMethodModal(rerouteFulfillmentConfig.shippingMethod)">{{ Object.keys(getShipmentMethodConfig()).length > 0 ? translate('Edit') : translate('Add')}}</ion-button>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Partial Order rejection") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify whether you reject a BOPIS order partially when any order item inventory is insufficient at the store.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!hasPermission(Actions.APP_PARTIAL_ORDER_REJECTION_CONFIG_UPDATE)" :checked="partialOrderRejectionConfig.settingValue" @ionChange="updatePartialOrderRejectionConfig(partialOrderRejectionConfig, $event.detail.checked)">{{ translate("Allow partial rejection") }}</ion-toggle>
          </ion-item>
        </ion-card>
        
      </section>

      <hr />
      <div class="section-header">
        <h1>
          {{ translate('App') }}
          <p class="overline">{{ "Version: " + appVersion }}</p>
        </h1>
        <p class="overline">{{ "Built: " + getDateTime(appInfo.builtTime) }}</p>
      </div>

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />
        <DxpLanguageSwitcher />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Shipping orders") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('View shipping orders along with pickup orders.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_SHOW_SHIPPING_ORD_PREF_UPDATE)">
            <ion-toggle label-placement="start" :checked="getBopisProductStoreSettings('SHOW_SHIPPING_ORDERS')" @click.prevent="setBopisProductStoreSettings($event, 'SHOW_SHIPPING_ORDERS')">{{ translate("Show shipping orders") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Packing Slip") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Packing slips help customer reconcile their order against the delivered items.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_PRINT_PACKING_SLIP_PREF_UPDATE)">
            <ion-toggle label-placement="start" :checked="getBopisProductStoreSettings('PRINT_PACKING_SLIPS')" @click.prevent="setBopisProductStoreSettings($event, 'PRINT_PACKING_SLIPS')">{{ translate("Generate packing slips") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Track Pickers") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Track who picked orders by entering picker IDs when packing an order.') }}
          </ion-card-content>
          <ion-item :disabled="!hasPermission(Actions.APP_ENABLE_TRACKING_PREF_UPDATE)">
            <ion-toggle label-placement="start" :checked="getBopisProductStoreSettings('ENABLE_TRACKING')" @click.prevent="setBopisProductStoreSettings($event, 'ENABLE_TRACKING')">{{ translate("Enable tracking") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none" :disabled="!hasPermission(Actions.APP_PRINT_PICKLIST_PREF_UPDATE)">
            <ion-toggle label-placement="start" :checked="getBopisProductStoreSettings('PRINT_PICKLISTS')" @click.prevent="setBopisProductStoreSettings($event, 'PRINT_PICKLISTS')">{{ translate("Print picklists") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card v-if="notificationPrefs.length">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Notification Preference") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Select the notifications you want to receive.') }}
          </ion-card-content>
          <ion-list>
            <ion-item :key="pref.enumId" v-for="pref in notificationPrefs" lines="none">
              <ion-toggle label-placement="start" @click.prevent="confirmNotificationPrefUpdate(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonAvatar,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent, computed } from 'vue';
import {
  codeWorkingOutline,
  ellipsisVertical,
  openOutline,
  personCircleOutline,
  sendOutline,
  storefrontOutline
} from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from '@/components/Image.vue';
import { DateTime } from 'luxon';
import { UserService } from '@/services/UserService'
import { showToast } from '@/utils';
import { hasError, removeClientRegistrationToken, subscribeTopic, unsubscribeTopic } from '@/adapter'
import { initialiseFirebaseApp, translate, useUserStore } from "@hotwax/dxp-components";
import { Actions, hasPermission } from '@/authorization'
import { addNotification, generateTopicName, isFcmConfigured, storeClientRegistrationToken } from "@/utils/firebase";
import emitter from "@/event-bus"
import logger from '@/logger';
import EditShipmentMethodModal from '@/components/EditShipmentMethodModal.vue';

export default defineComponent({
  name: 'Settings',
  components: {
    IonAvatar,
    IonButton, 
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel,
    IonList,
    IonPage, 
    IonTitle,
    IonToggle, 
    IonToolbar,
    Image
  },
  data(){
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      appInfo: (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any,
      appVersion: "",
      rerouteFulfillmentConfig: {
        // TODO Remove fromDate and directly store values making it loosely coupled with OMS
        allowDeliveryMethodUpdate: {},
        allowDeliveryAddressUpdate: {},
        allowPickupUpdate: {},
        allowCancel: {},
        shippingMethod: {},
        orderItemSplit: {}
      } as any,
      carriers: [] as any,
      availableShipmentMethods: [] as any,
      rerouteFulfillmentConfigMapping: (process.env.VUE_APP_RF_CNFG_MPNG? JSON.parse(process.env.VUE_APP_RF_CNFG_MPNG) : {}) as any
    }
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentEComStore: 'user/getCurrentEComStore',
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      firebaseDeviceId: 'user/getFirebaseDeviceId',
      notificationPrefs: 'user/getNotificationPrefs',
      allNotificationPrefs: 'user/getAllNotificationPrefs',
      getBopisProductStoreSettings: "user/getBopisProductStoreSettings"
    })
  },
  mounted() {
    this.appVersion = this.appInfo.branch ? (this.appInfo.branch + "-" + this.appInfo.revision) : this.appInfo.tag;
  },
  async ionViewWillEnter() {
    // Only fetch configuration when environment mapping exists
    if (Object.keys(this.rerouteFulfillmentConfigMapping).length > 0) {
      this.fetchCarriers()
      this.getAvailableShipmentMethods();
      this.getRerouteFulfillmentConfiguration();
    }

    // fetching partial order rejection when entering setting page to have latest information
    await this.store.dispatch('user/getPartialOrderRejectionConfig')

    // as notification prefs can also be updated from the notification pref modal,
    // latest state is fetched each time we open the settings page
    await this.store.dispatch('user/fetchNotificationPreferences')
  },
  methods: {
    async updateFacility(facility: any) {
      const previousEComStoreId = this.currentEComStore.productStoreId
      await this.store.dispatch('user/setFacility', facility?.facilityId);
      await this.store.dispatch('user/fetchNotificationPreferences')
      if(Object.keys(this.rerouteFulfillmentConfigMapping).length > 0 && previousEComStoreId !== this.currentEComStore.productStoreId) {
        this.getAvailableShipmentMethods();
        this.getRerouteFulfillmentConfiguration();
      }
      // clear facility lat lon and stores information state when facility changes
      this.store.dispatch("util/clearCurrentFacilityLatLon", {})
      this.store.dispatch("util/clearStoresInformation", {})
    },
    async timeZoneUpdated(tzId: string) {
      await this.store.dispatch("user/setUserTimeZone", tzId)
    },
    async logout () {
      // remove firebase notification registration token -
      // OMS and auth is required hence, removing it before logout (clearing state)
      try {
        await removeClientRegistrationToken(this.firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID)
      } catch (error) {
        logger.error(error)
      }

      this.store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl) => {
        // if not having redirection url then redirect the user to launchpad
        if(!redirectionUrl) {
          const redirectUrl = window.location.origin + '/login'
          window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
        }
      })
    },
    goToLaunchpad() {
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
    },
    setBopisProductStoreSettings (ev: any, enumId: any) {
      ev.stopImmediatePropagation();
      this.store.dispatch('user/setProductStoreSetting', { enumId, value: !this.getBopisProductStoreSettings(enumId) })
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    async openEditShipmentMethodModal(config: any) {
      const editShipmentMethodModal = await modalController.create({
        component: EditShipmentMethodModal,
        componentProps: { currentcConfig: this.getShipmentMethodConfig(), carriers:  this.carriers, availableShipmentMethods: this.availableShipmentMethods }
      });
      
      editShipmentMethodModal.onDidDismiss().then(async(result: any) => {
        if(result.data?.shippingMethod) {
          await this.updateRerouteFulfillmentConfiguration(config, result.data?.shippingMethod)
        }
      })

      return editShipmentMethodModal.present();
    },
    getShipmentMethodConfig() {
      if (Object.keys(this.rerouteFulfillmentConfig.shippingMethod).length !== 0) {
        try {
          const shippingMethodConfig = this.rerouteFulfillmentConfig.shippingMethod.settingValue ? JSON.parse(this.rerouteFulfillmentConfig.shippingMethod.settingValue) : {};
          if (Object.keys(shippingMethodConfig).length > 0) {
            const shipmentMethodDesc = this.availableShipmentMethods.find((shipmentMethod: any) => shipmentMethod.shipmentMethodTypeId === shippingMethodConfig.shipmentMethodTypeId)?.description;
            const carrierName = this.carriers.find((carrier: any) => carrier.partyId === shippingMethodConfig.carrierPartyId)?.groupName;
            return { ...shippingMethodConfig, shipmentMethodDesc, carrierName };
          }
        } catch (error) {
          console.error('Error parsing shipping method config:', error);
          return {};
        }
      }
      return {};
    },
    async fetchCarriers () {
      this.availableShipmentMethods = [];
      try {
        const resp = await UserService.getRerouteFulfillmentConfig({
          "entityName": "CarrierShipmentMethodCount",
          "inputFields": {
            "roleTypeId": "CARRIER",
            "partyTypeId": "PARTY_GROUP"
          },
          "fieldList": ["partyId", "roleTypeId", "groupName"],
          "viewIndex": 0,
          "viewSize": 250,  // maximum records we could have
          "distinct": "Y",
          "noConditionFind": "Y",
          "orderBy": "groupName"
        }) as any;
        if (!hasError(resp) && resp.data?.docs) {
          this.carriers = resp.data.docs;
        }
      } catch(err) {
        logger.error(err)
      }
    },
    async getAvailableShipmentMethods () {
      this.availableShipmentMethods = [];
      try {
        const resp = await UserService.getRerouteFulfillmentConfig({
          "inputFields": {
            "productStoreId": this.currentEComStore?.productStoreId,
            "shipmentMethodTypeId": "STOREPICKUP",
            "shipmentMethodTypeId_op": "notEqual"
          },
          "filterByDate": 'Y',
          "entityName": "ProductStoreShipmentMethView",
          "fieldList": ["productStoreShipMethId", "partyId", "shipmentMethodTypeId", "description"],
          "viewSize": 250
        }) as any;
        if (!hasError(resp) && resp.data?.docs) {
          this.availableShipmentMethods = resp.data.docs;
        }
      } catch(err) {
        logger.error(err)
      }
    },
    async getRerouteFulfillmentConfiguration(settingTypeEnumId?: any) {
      try {
        const payload = {
          "inputFields": {
            "productStoreId": this.currentEComStore?.productStoreId,
            settingTypeEnumId
          },
          "filterByDate": 'Y',
          "entityName": "ProductStoreSetting",
          "fieldList": ["settingTypeEnumId", "settingValue", "fromDate"],
          "viewSize": 5
        } as any

        // get all values
        if (!payload.inputFields.settingTypeEnumId) {
          payload.inputFields.settingTypeEnumId = Object.values(this.rerouteFulfillmentConfigMapping);
          payload.inputFields.settingTypeEnumId_op = "in"
          payload.viewSize = Object.values(this.rerouteFulfillmentConfigMapping)?.length

        }

        const resp = await UserService.getRerouteFulfillmentConfig(payload) as any
        if (!hasError(resp) && resp.data?.docs) {
          const rerouteFulfillmentConfigMappingFlipped = Object.fromEntries(Object.entries(this.rerouteFulfillmentConfigMapping).map(([key, value]) => [value, key])) as any;
          resp.data.docs.map((config: any) => {
            this.rerouteFulfillmentConfig[rerouteFulfillmentConfigMappingFlipped[config.settingTypeEnumId]] = config;
          })
        } else {
          Object.keys(this.rerouteFulfillmentConfigMapping).map((key) => {
            this.rerouteFulfillmentConfig[key] = {};
          });
        }
      } catch(err) {
        logger.error(err)
        Object.keys(this.rerouteFulfillmentConfigMapping).map((key) => {
          this.rerouteFulfillmentConfig[key] = {};
        });
      }
    },
    async updateRerouteFulfillmentConfiguration(config: any, value: any) {
      const params = {
        "fromDate": config.fromDate,
        "productStoreId": this.currentEComStore?.productStoreId,
        "settingTypeEnumId": config.settingTypeEnumId,
        "settingValue": value
      }

      try {
        const resp = await UserService.updateRerouteFulfillmentConfig(params) as any
        if(!hasError(resp)) {
          showToast(translate('Configuration updated'))
        } else {
          showToast(translate('Failed to update configuration'))
        }
      } catch(err) {
        showToast(translate('Failed to update configuration'))
        logger.error(err)
      }
      // Fetch the updated configuration
      await this.getRerouteFulfillmentConfiguration(config.settingTypeEnumId);
    },
    async updatePartialOrderRejectionConfig(config: any, value: any) {
      const params = {
        ...config,
        "settingValue": value
      }
      await this.store.dispatch('user/updatePartialOrderRejectionConfig', params)
    },
    async updateNotificationPref(enumId: string) {
      let isToggledOn = false;

      try {
        if (!isFcmConfigured()) {
          logger.error("FCM is not configured.");
          showToast(translate('Notification preferences not updated. Please try again.'))
          return;
        }

        emitter.emit('presentLoader',  { backdropDismiss: false })
        const facilityId = this.currentFacility?.facilityId
        const topicName = generateTopicName(facilityId, enumId)

        const notificationPref = this.notificationPrefs.find((pref: any) => pref.enumId === enumId)
        notificationPref.isEnabled
          ? await unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID)
          : await subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID)

        isToggledOn = !notificationPref.isEnabled
        notificationPref.isEnabled = !notificationPref.isEnabled
        await this.store.dispatch('user/updateNotificationPreferences', this.notificationPrefs)
        showToast(translate('Notification preferences updated.'))
      } catch (error) {
        showToast(translate('Notification preferences not updated. Please try again.'))
      } finally {
        emitter.emit("dismissLoader")
      }
      
      try {
        if(!this.allNotificationPrefs.length && isToggledOn) {
          await initialiseFirebaseApp(JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG), process.env.VUE_APP_FIREBASE_VAPID_KEY, storeClientRegistrationToken, addNotification)
        } else if(this.allNotificationPrefs.length == 1 && !isToggledOn) {
          await removeClientRegistrationToken(this.firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID)
        }
        await this.store.dispatch("user/fetchAllNotificationPrefs");
      } catch(error) {
        logger.error(error);
      }
    },
    async confirmNotificationPrefUpdate(enumId: string, event: CustomEvent) {
      event.stopImmediatePropagation();

      const message = translate("Are you sure you want to update the notification preferences?");
      const alert = await alertController.create({
        header: translate("Update notification preferences"),
        message,
        buttons: [
          {
            text: translate("Cancel"),
            role: "cancel"
          },
          {
            text: translate("Confirm"),
            handler: async () => {
              // passing event reference for updation in case the API success
              alertController.dismiss()
              await this.updateNotificationPref(enumId)
            }
          }
        ],
      });
      return alert.present();
    }
  },
  setup () {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      currentFacility,
      ellipsisVertical,
      hasPermission,
      personCircleOutline,
      router,
      sendOutline,
      store,
      storefrontOutline,
      codeWorkingOutline,
      openOutline,
      translate
    }
  }
});
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
  ion-content {
    --padding-bottom: 80px;
  }
</style>
