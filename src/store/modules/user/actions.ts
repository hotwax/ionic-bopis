import { UserService } from '@/services/UserService'
import { UtilService } from '@/services/UtilService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import store from '@/store';
import UserState from './UserState'
import * as types from './mutation-types'
import { getCurrentFacilityId, showToast } from '@/utils'
import {
  getNotificationEnumIds,
  getNotificationUserPrefTypeIds,
  hasError,
  logout,
  resetConfig,
  storeClientRegistrationToken,
  updateInstanceUrl,
  updateToken
} from '@/adapter'
import { DateTime, Settings } from 'luxon';
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions
} from '@/authorization'
import { translate, useAuthStore, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
import { generateDeviceId, generateTopicName } from '@/utils/firebase'
import emitter from '@/event-bus'
import logger from '@/logger';

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch, getters }, payload) {
    try {
      const {token, oms} = payload;
      dispatch("setUserInstanceUrl", oms);

      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await UserService.getUserPermissions({
        permissionIds: [...new Set(serverPermissionsFromRules)]
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);


      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId );
        // If there are any errors or permission check fails do not allow user to login
        if (!hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          logger.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);

      //fetching user facilities
      const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_STOREFULFILLMENT_ADMIN" );
      const facilities = await useUserStore().getUserFacilities(userProfile?.partyId, "PICKUP", isAdminUser)
      if(!facilities.length) throw "Unable to login. User is not associated with any facility"

      await useUserStore().getFacilityPreference('SELECTED_FACILITY')
    
      userProfile.facilities = facilities;

      // removing duplicate records as a single user can be associated with a facility by multiple roles.
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if(uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);
      // TODO Use a separate API for getting facilities, this should handle user like admin accessing the app
      const currentEComStore = await UserService.getCurrentEComStore(token, getCurrentFacilityId());
      await useUserStore().setEComStorePreference(currentEComStore);
      /*  ---- Guard clauses ends here --- */

      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }
      updateToken(token)

      // TODO user single mutation
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, currentEComStore)
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })

      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(currentEComStore?.productStoreId)

      //fetching partial order rejection config for BOPIS orders
      await dispatch("getPartialOrderRejectionConfig");
      await dispatch("fetchAllNotificationPrefs");
      await dispatch("fetchBopisProductStoreSettings");
      
    } catch (err: any) {
      // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
      // TODO Check if handling of specific status codes is required.
      showToast(translate('Something went wrong while login. Please contact administrator'));
      logger.error("error", err);
      return Promise.reject(err instanceof Object ? err : new Error(err))
    }
  },

  /**
   * Logout user
   */
  async logout ({ commit, dispatch }, payload) {
    // store the url on which we need to redirect the user after logout api completes in case of SSO enabled
    let redirectionUrl = ''

    emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })

    // Calling the logout api to flag the user as logged out, only when user is authorised
    // if the user is already unauthorised then not calling the logout api as it returns 401 again that results in a loop, thus there is no need to call logout api if the user is unauthorised
    if(!payload?.isUserUnauthorised) {
      let resp;

      // wrapping the parsing logic in try catch as in some case the logout api makes redirection, and then we are unable to parse the resp and thus the logout process halts
      try {
        resp = await logout();

        // Added logic to remove the `//` from the resp as in case of get request we are having the extra characters and in case of post we are having 403
        resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp)
      } catch(err) {
        logger.error('Error parsing data', err)
      }

      if(resp?.logoutAuthType == 'SAML2SSO') {
        redirectionUrl = resp.logoutUrl
      }
    }
    
    const authStore = useAuthStore()
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    // TODO add any other tasks if need
    dispatch("product/clearProducts", null, { root: true })
    dispatch('clearNotificationState')
    dispatch('clearPartialOrderRejectionConfig');
    this.dispatch('util/updateRejectReasons', [])
    this.dispatch('util/updateCancelReasons', [])
    this.dispatch("util/clearFacilities", {})
    this.dispatch("util/clearEnumerations", {})
    this.dispatch("util/clearCurrentFacilityLatLon", {})
    this.dispatch("util/clearStoresInformation", {})
    commit(types.USER_END_SESSION)
    resetPermissions();
    resetConfig();

    // reset plugin state on logout
    authStore.$reset()
    userStore.$reset()
    productIdentificationStore.$reset()

    // If we get any url in logout api resp then we will redirect the user to the url
    if(redirectionUrl) {
      window.location.href = redirectionUrl
    }

    emitter.emit('dismissLoader')
    return redirectionUrl;
  },

  /**
   * run after updating current facility
   */
  async setFacility({ commit, dispatch }, facilityId) {
    const token = store.getters['user/getUserToken'];
    // clearing the orders state whenever changing the facility
    dispatch("order/clearOrders", null, {root: true})
    dispatch("product/clearProducts", null, {root: true})
    const previousEComStore = await useUserStore().getCurrentEComStore as any
    // fetching the eComStore for updated facility
    const eComStore = await UserService.getCurrentEComStore(token, facilityId);

    if(previousEComStore.productStoreId !== eComStore.productStoreId) {
      await useUserStore().setEComStorePreference(eComStore);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, eComStore)
      //fetching partial order rejection config for BOPIS orders aftering updating facility
      await dispatch("getPartialOrderRejectionConfig");
      await dispatch("fetchBopisProductStoreSettings");
      await useProductIdentificationStore().getIdentificationPref(eComStore?.productStoreId)
    }
  },
  /**
   * Set User Instance Url
   */
   setUserInstanceUrl ({ commit }, instanceUrl){
    commit(types.USER_INSTANCE_URL_UPDATED, instanceUrl)
    updateInstanceUrl(instanceUrl)
   },
  
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, timeZoneId) {
    const current: any = state.current;
    current.userTimeZone = timeZoneId;
    commit(types.USER_INFO_UPDATED, current);
    Settings.defaultZone = current.userTimeZone;
  },


  async getPartialOrderRejectionConfig ({ commit }) {
    let config = {};
    const params = {
      "inputFields": {
        "productStoreId": this.state.user.currentEComStore.productStoreId,
        "settingTypeEnumId": "BOPIS_PART_ODR_REJ"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["productStoreId", "settingTypeEnumId", "settingValue", "fromDate"],
      "viewSize": 1
    } as any

    try {
      const resp = await UserService.getPartialOrderRejectionConfig(params)
      if (resp.status === 200 && !hasError(resp) && resp.data?.docs) {
        config = resp.data?.docs[0];
      } else {
        logger.error('Failed to fetch partial order rejection configuration');
      }
    } catch (err) {
      logger.error(err);
    } 
    commit(types.USER_PARTIAL_ORDER_REJECTION_CONFIG_UPDATED, config);   
  },

  async updatePartialOrderRejectionConfig ({ dispatch }, payload) {  
    let resp = {} as any;
    try {
      if(!await UtilService.isEnumExists("BOPIS_PART_ODR_REJ")) {
        resp = await UtilService.createEnumeration({
          "enumId": "BOPIS_PART_ODR_REJ",
          "enumTypeId": "PROD_STR_STNG",
          "description": "BOPIS Partial Order Rejection",
          "enumName": "BOPIS Partial Order Rejection",
          "enumCode": "BOPIS_PART_ODR_REJ"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      if (!payload.fromDate) {
        //Create Product Store Setting
        payload = {
          ...payload, 
          "productStoreId": this.state.user.currentEComStore.productStoreId,
          "settingTypeEnumId": "BOPIS_PART_ODR_REJ",
          "fromDate": DateTime.now().toMillis()
        }
        resp = await UserService.createPartialOrderRejectionConfig(payload) as any
      } else {
        //Update Product Store Setting
        resp = await UserService.updatePartialOrderRejectionConfig(payload) as any
      }

      if (!hasError(resp)) {
        showToast(translate('Configuration updated'))
      } else {
        showToast(translate('Failed to update configuration'))
      }
    } catch(err) {
      showToast(translate('Failed to update configuration'))
      logger.error(err)
    }

    // Fetch the updated configuration
    await dispatch("getPartialOrderRejectionConfig");
  },

  addNotification({ state, commit }, payload) {
    const notifications = JSON.parse(JSON.stringify(state.notifications))
    notifications.push({ ...payload.notification, time: DateTime.now().toMillis() })
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, true)
    if (payload.isForeground) {
      showToast(translate("New notification received."));
    }
    commit(types.USER_NOTIFICATIONS_UPDATED, notifications)
  },

  async fetchNotificationPreferences({ commit, state }) {
    let resp = {} as any
    let notificationPreferences = [], enumerationResp = [], userPrefIds = [] as any

    try {
      resp = await getNotificationEnumIds(process.env.VUE_APP_NOTIF_ENUM_TYPE_ID)
      enumerationResp = resp.docs
      resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID, state.current.userLoginId)
      userPrefIds = resp.docs.map((userPref: any) => userPref.userPrefTypeId)
    } catch (error) {
      logger.error(error)
    } finally {
      // checking enumerationResp as we want to show disbaled prefs if only getNotificationEnumIds returns
      // data and getNotificationUserPrefTypeIds fails or returns empty response (all disbaled)
      if (enumerationResp.length) {
        notificationPreferences = enumerationResp.reduce((notifactionPref: any, pref: any) => {
          const userPrefTypeIdToSearch = generateTopicName(getCurrentFacilityId(), pref.enumId)
          notifactionPref.push({ ...pref, isEnabled: userPrefIds.includes(userPrefTypeIdToSearch) })
          return notifactionPref
        }, [])
      }
      commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, notificationPreferences)
    }
  },

  async fetchAllNotificationPrefs({ commit, state }) {
    let allNotificationPrefs = [];

    try {
      const resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID, state.current.userLoginId)
      allNotificationPrefs = resp.docs
    } catch(error) {
      logger.error(error)
    }

    commit(types.USER_ALL_NOTIFICATION_PREFS_UPDATED, allNotificationPrefs)
  },

  async fetchBopisProductStoreSettings({ commit, dispatch }) {
    const productStoreSettings = JSON.parse(process.env.VUE_APP_PRODUCT_STORE_SETTING_ENUMS);
    const settingValues = {} as any;

    const payload = {
      "inputFields": {
        "productStoreId": this.state.user.currentEComStore.productStoreId,
        "settingTypeEnumId": Object.keys(productStoreSettings),
        "settingTypeEnumId_op": "in"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingTypeEnumId", "settingValue", "fromDate"]
    }

    try {
      const resp = await UtilService.getProductStoreSettings(payload) as any
      if(!hasError(resp)) {
        resp.data.docs.map((setting: any) => {
          settingValues[setting.settingTypeEnumId] = setting.settingValue === "true"
        })
      } else {
        throw resp.data;
      }
    } catch(err) {
      logger.error(err)
    }

    //Set default to false if there is no product setting exists
    const missingSettings = Object.keys(productStoreSettings).filter((settingTypeEnumId) => !Object.keys(settingValues).includes(settingTypeEnumId));
    missingSettings.map((settingTypeEnumId: any) => settingValues[settingTypeEnumId] = false)
    commit(types.USER_BOPIS_PRODUCT_STORE_SETTINGS_UPDATED, settingValues)
  },

  async createProductStoreSetting({ commit }, enumeration) {
    const fromDate = Date.now()

    try {
      if(!await UtilService.isEnumExists(enumeration.enumId)) {
        const resp = await UtilService.createEnumeration({
          "enumId": enumeration.enumId,
          "enumTypeId": "PROD_STR_STNG",
          "description": enumeration.description,
          "enumName": enumeration.enumName
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      const params = {
        fromDate,
        "productStoreId": this.state.user.currentEComStore.productStoreId,
        "settingTypeEnumId": enumeration.enumId,
        "settingValue": "false"
      }

      await UtilService.createProductStoreSetting(params) as any
    } catch(err) {
      logger.error(err)
    }

    return fromDate;
  },

  async setProductStoreSetting({ commit, dispatch, state }, payload) {
    const productStoreSettings = JSON.parse(process.env.VUE_APP_PRODUCT_STORE_SETTING_ENUMS);
    let prefValue = state.bopisProductStoreSettings[payload.enumId]
    const eComStoreId = this.state.user.currentEComStore.productStoreId;

    // when selecting none as ecom store, not updating the pref as it's not possible to save pref with empty productStoreId
    if(!eComStoreId) {
      showToast(translate("Unable to update product store setting."))
      return;
    }

    let fromDate;

    try {
      let resp = await UtilService.getProductStoreSettings({
        "inputFields": {
          "productStoreId": this.state.user.currentEComStore.productStoreId,
          "settingTypeEnumId": payload.enumId
        },
        "filterByDate": 'Y',
        "entityName": "ProductStoreSetting",
        "fieldList": ["fromDate"],
        "viewSize": 1
      }) as any
      if(!hasError(resp)) {
        fromDate = resp.data.docs[0]?.fromDate
        const params = {
          "fromDate": fromDate,
          "productStoreId": eComStoreId,
          "settingTypeEnumId": payload.enumId,
          "settingValue": `${payload.value}`
        }
        
        resp = await UtilService.updateProductStoreSetting(params) as any
        if((!hasError(resp))) {
          prefValue = payload.value
        } else {
          throw resp.data;
        }
      } else {
        throw resp.data
      }
    } catch(err) {
      showToast(translate("Failed to update product store setting."))
      logger.error(err)
    }

    const settingValues = JSON.parse(JSON.stringify(state.bopisProductStoreSettings))
    settingValues[payload.enumId] = prefValue
    commit(types.USER_BOPIS_PRODUCT_STORE_SETTINGS_UPDATED, settingValues)
  },

  async updateNotificationPreferences({ commit }, payload) {
    commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, payload)
  },

  async storeClientRegistrationToken({ commit }, registrationToken) {
    const firebaseDeviceId = generateDeviceId()
    commit(types.USER_FIREBASE_DEVICEID_UPDATED, firebaseDeviceId)

    try {
      await storeClientRegistrationToken(registrationToken, firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID)
    } catch (error) {
      logger.error(error)
    }
  },

  clearNotificationState({ commit }) {
    commit(types.USER_NOTIFICATIONS_UPDATED, [])
    commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, [])
    commit(types.USER_FIREBASE_DEVICEID_UPDATED, '')
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, true)
  },

  setUnreadNotificationsStatus({ commit }, payload) {
    commit(types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED, payload)
  },

  clearPartialOrderRejectionConfig ({ commit }) {
    commit(types.USER_PARTIAL_ORDER_REJECTION_CONFIG_UPDATED, {})
  }
}
export default actions;