export default interface UserState {
    token: string;
    current: any;
    currentFacility: object;
    instanceUrl: string;
    preference: any;
    permissions: any;
    currentEComStore: any;
    partialOrderRejectionConfig: any;
    pwaState: any;
    notifications: any;
    notificationPrefs: any;
    firebaseDeviceId: string;
    hasUnreadNotifications: boolean
}