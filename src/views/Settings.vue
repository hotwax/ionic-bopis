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
        <OmsInstanceNavigator />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ translate("Select facility") }}</ion-label>
            <ion-select interface="popover" :value="currentFacility?.facilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.facilityName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

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
            <ion-label>{{ translate("Delivery method") }}</ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowDeliveryMethodUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryMethodUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryMethodUpdate, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ translate("Delivery address") }}</ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowDeliveryAddressUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryAddressUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryAddressUpdate, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ translate("Pick up location") }}</ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowPickupUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowPickupUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowPickupUpdate, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ translate("Cancel order before fulfillment") }}</ion-label>
            <!-- <p>Uploading order cancelations to Shopify is currently disabled. Order cancelations in HotWax will not be synced to Shopify.</p> -->
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowCancel).length == 0" :checked="rerouteFulfillmentConfig.allowCancel.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowCancel, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ translate("Shipment method") }}</ion-label>
            <ion-select :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.shippingMethod).length == 0" interface="popover" :value="rerouteFulfillmentConfig.shippingMethod.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.shippingMethod, $event.detail.value)">
              <ion-select-option v-for="shipmentMethod in availableShipmentMethods" :key="shipmentMethod.shipmentMethodTypeId" :value="shipmentMethod.shipmentMethodTypeId" >{{ shipmentMethod.description }}</ion-select-option>
            </ion-select>
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
            <ion-label>{{ translate("Allow partial rejection") }}</ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_PARTIAL_ORDER_REJECTION_CONFIG_UPDATE)" :checked="partialOrderRejectionConfig.settingValue" @ionChange="updatePartialOrderRejectionConfig(partialOrderRejectionConfig, $event.detail.checked)" slot="end" />
          </ion-item>
        </ion-card>
        
      </section>

      <hr />
      <DxpAppVersionInfo />

      <section>
        <ProductIdentifier />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Timezone') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ translate("Change") }}</ion-button>
          </ion-item>
        </ion-card>

        <LanguageSwitcher />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Shipping orders") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('View shipping orders along with pickup orders.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ translate("Show shipping orders") }}</ion-label>
            <ion-toggle :checked="showShippingOrders" @ionChange="setShowShippingOrdersPreference($event)" slot="end" />
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
          <ion-item lines="none">
            <ion-label>{{ translate("Generate packing slips") }}</ion-label>
            <ion-toggle :checked="showPackingSlip" @ionChange="setShowPackingSlipPreference($event)" slot="end" />
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
          <ion-item lines="none">
            <ion-label>{{ translate("Enable tracking") }}</ion-label>
            <ion-toggle :checked="configurePicker" @ionChange="setConfigurePickerPreference($event)" slot="end" />
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
              <ion-label class="ion-text-wrap">{{ pref.description }}</ion-label>
              <ion-toggle @click="confirmNotificationPrefUpdate(pref.enumId, $event)" :checked="pref.isEnabled" slot="end" />
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
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
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
import TimeZoneModal from './TimezoneModal.vue';
import Image from '@/components/Image.vue';
import { UserService } from '@/services/UserService'
import { showToast } from '@/utils';
import { hasError, removeClientRegistrationToken, subscribeTopic, unsubscribeTopic } from '@/adapter'
import { translate } from "@hotwax/dxp-components";
import { Actions, hasPermission } from '@/authorization'
import { generateTopicName } from "@/utils/firebase";
import emitter from "@/event-bus"

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
    IonSelect, 
    IonSelectOption,
    IonTitle,
    IonToggle, 
    IonToolbar,
    Image
  },
  data(){
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      rerouteFulfillmentConfig: {
        // TODO Remove fromDate and directly store values making it loosely coupled with OMS
        allowDeliveryMethodUpdate: {},
        allowDeliveryAddressUpdate: {},
        allowPickupUpdate: {},
        allowCancel: {},
        shippingMethod: {}
      } as any,
      availableShipmentMethods: [] as any,
      rerouteFulfillmentConfigMapping: (process.env.VUE_APP_RF_CNFG_MPNG? JSON.parse(process.env.VUE_APP_RF_CNFG_MPNG) : {}) as any
    }
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      configurePicker: "user/configurePicker",
      showShippingOrders: 'user/showShippingOrders',
      showPackingSlip: 'user/showPackingSlip',
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      firebaseDeviceId: 'user/getFirebaseDeviceId',
      notificationPrefs: 'user/getNotificationPrefs'
    })
  },
  async ionViewWillEnter() {
    // Only fetch configuration when environment mapping exists
    if (Object.keys(this.rerouteFulfillmentConfigMapping).length > 0) {
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
    setFacility (event: any) {
      // If the value is same, no need to update
      // Handled case for programmatical changes
      // https://github.com/ionic-team/ionic-framework/discussions/25532
      // https://github.com/ionic-team/ionic-framework/issues/20106
      // https://github.com/ionic-team/ionic-framework/pull/25858
      if (this.userProfile && this.currentFacility?.facilityId !== event.detail.value)
        this.store.dispatch('user/setFacility', {
          'facilityId': event.detail.value
        });
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    },
    async logout () {
      // remove firebase notification registration token -
      // OMS and auth is required hence, removing it before logout (clearing state)
      try {
        await removeClientRegistrationToken(this.firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID)
      } catch (error) {
        console.error(error)
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
    setShowShippingOrdersPreference (ev: any) {
      this.store.dispatch('user/setUserPreference', { showShippingOrders: ev.detail.checked })
    },
    setShowPackingSlipPreference (ev: any){
      this.store.dispatch('user/setUserPreference', { showPackingSlip: ev.detail.checked })
    },
    setConfigurePickerPreference (ev: any){
      this.store.dispatch('user/setUserPreference', { configurePicker: ev.detail.checked })
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
          "fieldList": ["shipmentMethodTypeId", "description"],
          "viewSize": 10
        }) as any;
        if (!hasError(resp) && resp.data?.docs) {
          this.availableShipmentMethods = resp.data.docs;
        }
      } catch(err) {
        console.error(err)
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

        }

        const resp = await UserService.getRerouteFulfillmentConfig(payload) as any
        if (!hasError(resp) && resp.data?.docs) {
          const rerouteFulfillmentConfigMappingFlipped = Object.fromEntries(Object.entries(this.rerouteFulfillmentConfigMapping).map(([key, value]) => [value, key])) as any;
          resp.data.docs.map((config: any) => {
            this.rerouteFulfillmentConfig[rerouteFulfillmentConfigMappingFlipped[config.settingTypeEnumId]] = config;
          })
        }
      } catch(err) {
        console.error(err)
      }
    },
    async updateRerouteFulfillmentConfiguration(config: any, value: any) {
      // Handled initial programmatical update
      // When storing boolean values, it is stored as string. Further comparison needs conversion
      if (config.settingValue === value || (typeof value === 'boolean' && (config.settingValue == 'true') === value)) {
        return;
      }
      
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
        console.error(err)
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
    async updateNotificationPref(enumId: string, event: any) {
      try {
        const facilityId = (this.currentFacility as any).facilityId
        const topicName = generateTopicName(facilityId, enumId)
        // event.target.checked returns the initial value (the value that was there before clicking
        // and updating the toggle). But it returns the updated value on further references (if passed
        // as a parameter in other function, here in our case, passed from confirmNotificationPrefUpdate)
        // Hence, event.target.checked here holds the updated value (value after the toggle action)
        event.target.checked
          ? await subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID)
          : await unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID)
        showToast(translate('Notification preferences updated.'))
      } catch (error) {
        // reverting the value of toggle as event.target.checked is 
        // updated on click event, and revert is needed on API fail
        event.target.checked = !event.target.checked;
        showToast(translate('Notification preferences not updated. Please try again.'))
      } finally {
        emitter.emit("dismissLoader")
      }
    },
    async confirmNotificationPrefUpdate(enumId: string, event: any) {
      const message = translate("Are you sure you want to update the notification preferences?");
      const alert = await alertController.create({
        header: translate("Update notification preferences"),
        message,
        buttons: [
          {
            text: translate("Cancel"),
            handler: () => {
              // reverting the value of toggle as event.target.checked is 
              // updated on click event and revert is needed on "Cancel"
              event.target.checked = !event.target.checked
            }
          },
          {
            text: translate("Confirm"),
            handler: async () => {
              // passing event reference for updation in case the API fails
              await this.updateNotificationPref(enumId, event)
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

    return {
      Actions,
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
