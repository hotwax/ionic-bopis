import { DateTime } from "luxon"
import store from '@/store'

const deviceId = store.getters['user/getFirebaseDeviceId'];

const storeClientRegistrationToken = async (registrationToken: string) => store.dispatch('user/storeClientRegistrationToken', registrationToken);

const addNotification = async (notification: any) => store.dispatch('user/addNotification', notification);

// device ID: <DDMMYY><timestamp[6]>
const generateDeviceId = () => deviceId ? deviceId : (DateTime.now().toFormat('ddMMyy') + String(DateTime.now().toMillis()).slice(-6))

// topic name: oms-facilityId-enumId(enumCode)
const generateTopicName = (facilityId: string, enumId: string) => {
  const userProfile = store.getters['user/getUserProfile'];
  return `${userProfile.omsInstanceName}-${facilityId}-${enumId}`;
};

export {
  addNotification,
  generateTopicName,
  generateDeviceId,
  storeClientRegistrationToken
}