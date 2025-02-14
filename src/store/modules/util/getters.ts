import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getRejectReasons(state) {
    return state.rejectReasons ? state.rejectReasons : []
  },
  getPaymentMethodDesc: (state) => (paymentMethodTypeId: string) => {
    return state.paymentMethodTypeDesc[paymentMethodTypeId] ? state.paymentMethodTypeDesc[paymentMethodTypeId] : paymentMethodTypeId
  },
  getStatusDesc: (state) => (statusId: string) => {
    return state.statusDesc[statusId] ? state.statusDesc[statusId] : statusId
  },
  getFacilityTypeDesc: (state) => (facilityTypeId: string) => {
    return state.facilityTypeDesc[facilityTypeId] ? state.facilityTypeDesc[facilityTypeId] : ''
  },
  getPartyName: (state) => (partyId: string) => {
    return state.partyNames[partyId] ? state.partyNames[partyId] : ''
  },
  getCancelReasons(state) {
    return state.cancelReasons ? state.cancelReasons : []
  },
  getFacilityName: (state) => (facilityId: string) => {
    return state.facilities[facilityId] ? state.facilities[facilityId] : facilityId
  },
  getEnumDescription: (state) => (enumId: string) => {
    return state.enumerations[enumId] ? state.enumerations[enumId] : enumId
  },
   getFacilityLatLon: (state) => (facilityId: string) => {
    return state.facilitiesLatLng[facilityId] ? state.facilitiesLatLng[facilityId] : {}
  },
  getStoresInformation: (state) => {
    return state.storesInformation ? state.storesInformation : []
  }
}
export default getters;