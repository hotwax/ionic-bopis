export default interface UtilState {
  rejectReasons: [];
  paymentMethodTypeDesc: any;
  statusDesc: any;
  facilityTypeDesc: any;
  partyNames: any;
  cancelReasons: Array<any>;
  facilities: any;
  enumerations: any;
 facilitiesLatLng: {
  [facilityId :string]: { latitude: any , longitude: any }
},
  storesInformation: any;
}