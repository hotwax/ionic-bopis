import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import store from '@/store';
import UserState from './UserState'
import * as types from './mutation-types'
import { showToast } from '@/utils'
import {
  getUserPreference,
  getNotificationEnumIds,
  getNotificationUserPrefTypeIds,
  getUserFacilities,
  hasError,
  logout,
  resetConfig,
  setUserPreference,
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
        permissionIds: serverPermissionsFromRules
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);


      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermissionId: any) => appPermissionId === permissionId );
        // If there are any errors or permission check fails do not allow user to login
        if (hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          console.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);

      //fetching user facilities
      const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_STOREFULFILLMENT_ADMIN" );
      const baseURL = store.getters['user/getBaseUrl'];
      const facilities = await getUserFacilities(token, baseURL, userProfile?.partyId, "PICKUP", isAdminUser);
      userProfile.facilities = facilities;

      // removing duplicate records as a single user can be associated with a facility by multiple roles.
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if(uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);
      // TODO Use a separate API for getting facilities, this should handle user like admin accessing the app
      const currentFacility = userProfile.facilities.length > 0 ? userProfile.facilities[0] : {};
      const currentEComStore = await UserService.getCurrentEComStore(token, currentFacility?.facilityId);
      const userPreference = await getUserPreference(token, getters['getBaseUrl'], 'BOPIS_PREFERENCE')

      /*  ---- Guard clauses ends here --- */

      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }
      updateToken(token)

      // TODO user single mutation
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_CURRENT_FACILITY_UPDATED, currentFacility);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, currentEComStore)
      commit(types.USER_PREFERENCE_UPDATED, userPreference)
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })

      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(currentEComStore?.productStoreId)

      //fetching partial order rejection config for BOPIS orders
      await dispatch("getPartialOrderRejectionConfig");
      
    } catch (err: any) {
      // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
      // TODO Check if handling of specific status codes is required.
      showToast(translate('Something went wrong while login. Please contact administrator'));
      console.error("error", err);
      return Promise.reject(new Error(err))
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
        console.error('Error parsing data', err)
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
    this.dispatch('order/clearOrders')
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
   * update current facility information
   */
  async setFacility ({ commit, dispatch, state }, payload) {
    let facility = payload.facility;
    if(!facility && state.current?.facilities) {
      facility = state.current.facilities.find((facility: any) => facility.facilityId === payload.facilityId);
    }
    // clearing the orders state whenever changing the facility
    dispatch("order/clearOrders", null, {root: true})
    dispatch("product/clearProducts", null, {root: true})
    commit(types.USER_CURRENT_FACILITY_UPDATED, facility);
    const eComStore = await UserService.getCurrentEComStore(undefined, facility?.facilityId);
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, eComStore)

    await useProductIdentificationStore().getIdentificationPref(eComStore?.productStoreId)
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
  async setUserTimeZone ( { state, commit }, payload) {
    const resp = await UserService.setUserTimeZone(payload)
    if (resp.status === 200 && !hasError(resp)) {
      const current: any = state.current;
      current.userTimeZone = payload.timeZoneId;
      commit(types.USER_INFO_UPDATED, current);
      Settings.defaultZone = current.userTimeZone;
      showToast(translate("Time zone updated successfully"));
    }
  },

  updatePwaState({commit}, payload) {
    commit(types.USER_PWA_STATE_UPDATED, payload);
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
        console.error('Failed to fetch partial order rejection configuration');
      }
    } catch (err) {
      console.error(err);
    } 
    commit(types.USER_PARTIAL_ORDER_REJECTION_CONFIG_UPDATED, config);   
  },

  async updatePartialOrderRejectionConfig ({ dispatch }, payload) {  
    let resp = {};
    try {
      
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
      console.error(err)
    }

    // Fetch the updated configuration
    await dispatch("getPartialOrderRejectionConfig");
  },

  setUserPreference( {state, commit }, payload){
    commit(types.USER_PREFERENCE_UPDATED, payload)
    setUserPreference({
      'userPrefTypeId': 'BOPIS_PREFERENCE',
      'userPrefValue': JSON.stringify(state.preference)
    });
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
    const facilityId = (state.currentFacility as any).facilityId
    let notificationPreferences = [], enumerationResp = [], userPrefIds = [] as any
    try {
      resp = await getNotificationEnumIds(process.env.VUE_APP_NOTIF_ENUM_TYPE_ID)
      enumerationResp = resp.docs
      resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID)
      userPrefIds = resp.docs.map((userPref: any) => userPref.userPrefTypeId)
    } catch (error) {
      console.error(error)
    } finally {
      // checking enumerationResp as we want to show disbaled prefs if only getNotificationEnumIds returns
      // data and getNotificationUserPrefTypeIds fails or returns empty response (all disbaled)
      if (enumerationResp.length) {
        notificationPreferences = enumerationResp.reduce((notifactionPref: any, pref: any) => {
          const userPrefTypeIdToSearch = generateTopicName(facilityId, pref.enumId)
          notifactionPref.push({ ...pref, isEnabled: userPrefIds.includes(userPrefTypeIdToSearch) })
          return notifactionPref
        }, [])
      }
      commit(types.USER_NOTIFICATIONS_PREFERENCES_UPDATED, notificationPreferences)
    }
  },

  async storeClientRegistrationToken({ commit }, registrationToken) {
    const firebaseDeviceId = generateDeviceId()
    commit(types.USER_FIREBASE_DEVICEID_UPDATED, firebaseDeviceId)

    try {
      await storeClientRegistrationToken(registrationToken, firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID)
    } catch (error) {
      console.error(error)
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