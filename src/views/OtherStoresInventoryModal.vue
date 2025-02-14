<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Other stores") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="sortByDistance">
          <ion-icon slot="icon-only" :icon="locationOutline"
            :color="sortBy === 'distance' ? 'primary' : 'medium'"></ion-icon>
        </ion-button>
        <ion-button @click="sortByName">
          <ion-icon slot="icon-only" :icon="textOutline" :color="sortBy === 'name' ? 'primary' : 'medium'"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
    <ion-searchbar v-model="queryString" :placeholder="translate('Search store name')"
      @keyup.enter="queryString = $event.target.value; searchFacilities()" />
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-toggle @click="toggleHideEmptyStock" label-placement="start">{{ translate("Hide facilities without stock")}}</ion-toggle>
      </ion-item>
    </ion-list>
    <ion-accordion-group v-if="storesWithInventory.length">
      <template v-for="store in storesWithInventory" :key="store.storeCode">
        <!-- render accordion for items with calendar -->
        <ion-accordion v-if="hasWeekCalendar(store)" :value="store.storeCode">
          <ion-item slot="header" lines="inset">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ store.storeCode }}</p>
              <h2>{{ store.storeName }}</h2>
              <ion-note v-if="hasWeekCalendar(store)" :color="store.isOpen ? '' : 'danger'">
                {{ store.hoursDisplay }}
              </ion-note>
              <p v-if="typeof store.dist === 'number'">{{ Math.round(store.dist) }} {{ translate("miles") }}</p>
            </ion-label>
            <div slot="end">
              <ion-note slot="end">{{ translate('ATP', { count: store.stock }) }}</ion-note>
            </div>
          </ion-item>
          <div class="ion-padding" slot="content">
            <ion-list lines="none">
              <ion-item v-for="day in weekArray" :key="day">
                <ion-label>
                  <p>{{ translate(day) }}</p>
                </ion-label>
                <ion-label slot="end">
                  <p v-if="store[`${day}_open`] && store[`${day}_close`]">
                    {{ formatTime(store[`${day}_open`]) }} - {{ formatTime(store[`${day}_close`]) }}
                  </p>
                  <p v-else>{{ translate("Closed") }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </ion-accordion>
        <!-- render list for items without calendar -->
        <ion-item v-else>
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ store.storeCode }}</p>
            <h2>{{ store.storeName }}</h2>
            <p v-if="typeof store.dist === 'number'">{{ Math.round(store.dist) }} {{ translate("miles") }}</p>
          </ion-label>
          <div slot="end">
            <ion-note slot="end">{{ translate('ATP', { count: store.stock }) }}</ion-note>
          </div>
        </ion-item>
      </template>
    </ion-accordion-group>
    <div v-else class="ion-text-center">
      <ion-spinner v-if="isRefreshing" name="crescent" />
      <p v-else>{{ translate("No inventory details found") }}</p>
    </div>
  </ion-content>
</template>

<script lang="ts">
import {
  IonAccordionGroup,
  IonAccordion,
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonIcon,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController,
  IonSpinner
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { close, locationOutline, textOutline, chevronDownOutline } from "ionicons/icons";
import { mapGetters } from "vuex";
import { useStore } from "@/store";
import { translate, useUserStore  } from "@hotwax/dxp-components";
import { DateTime } from "luxon";

export default defineComponent({
  name: "OtherStoresInventoryModal",
  components: {
    IonAccordionGroup,
    IonAccordion,
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSearchbar,
    IonTitle,
    IonToggle,
    IonToolbar,
    IonSpinner
  },
  props: ["otherStoresInventory"],
  data() {
    return {
      queryString: "",
      isRefreshing: false,
      storesInventory: [] as any, // will be used when fallback
      storesWithInventory: [] as any, // will be used primarily.
      hideEmptyStores: false,
      sortBy: "name", // 'name' or 'distance'
      weekArray: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    }
  },
  computed: {
    ...mapGetters({
      facilityLatLon: 'util/getFacilityLatLon',
      storesInformation: 'util/getStoresInformation'
    }),
    nearbyStores() {
      return this.storesInformation || [];
    },
  },
 async mounted() {
    this.isRefreshing = true;
    // Create a copy of otherStoresInventory on mount
    this.storesInventory = this.otherStoresInventory.slice();
    const currentFacilityId = this.currentFacility?.facilityId;

    try {
      // Check if the state already has the required data
      if (!this.facilityLatLon(currentFacilityId).latitude || !this.facilityLatLon(currentFacilityId).longitude) {
        // Fetching Lat Lon for current facility
        await this.store.dispatch("util/fetchCurrentFacilityLatLon", currentFacilityId);
      }

      if (!this.storesInformation || this.storesInformation.length === 0) {
        // Fetching store lookup
        if (this.facilityLatLon(currentFacilityId)?.latitude && this.facilityLatLon(currentFacilityId)?.longitude) {
          await this.store.dispatch("util/fetchStoresInformation", {
            latitude: this.facilityLatLon(currentFacilityId).latitude,
            longitude: this.facilityLatLon(currentFacilityId).longitude
          });
        }
      }

      // Map the stock information
      this.storesWithInventory = this.mapStock(this.storesInventory, this.storesInformation);
    } catch (error) {
      // Fallback mapping when APIs fail
      this.storesWithInventory = this.storesInventory.map((facility: any) => ({
        storeCode: facility.facilityId,
        storeName: facility.facilityName,
        stock: facility.stock
      }));
    } finally {
      this.isRefreshing = false;
    }

    // Sort by name by default
    this.sortByName();
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    searchFacilities() {
      this.isRefreshing = true;
      let filteredInventory = this.mapStock(this.storesInventory, this.storesInformation);
      if (this.queryString.trim() !== "") {
        filteredInventory = filteredInventory.filter((store: any) =>
          store.storeName.toLowerCase().includes(this.queryString.toLowerCase())
        );
      }
      if (this.hideEmptyStores) {
        filteredInventory = filteredInventory.filter((store: any) => store.stock > 0);
      }
      this.storesWithInventory = filteredInventory;
      this.isRefreshing = false;
    },
    // method to map the facility inventory from props to the store lookup data from api call
    mapStock(storesInventory: any[], storesInformation: any[]): any[] {
      return storesInformation.slice(1).map((store, index) => {  // skips first item (current facility)
        const matchingFacility = storesInventory.find(facility => facility.facilityId === store.storeCode);
        const storeHoursInfo = this.getStoreHoursStatus(store);
        return {
          ...store,
          index: index + 1,
          stock: matchingFacility ? matchingFacility.stock : 0,
          hoursDisplay: storeHoursInfo.display,
          isOpen: storeHoursInfo.isOpen
        };
      });
    },
    // logic for sorting stores by names
    sortByNameLogic(a: any, b: any): number {
      return a.storeName.localeCompare(b.storeName);
    },
    // method to sort the stores by distance 
    sortByDistance() {
      this.sortBy = 'distance';
      // if store has Infinity distance, move it to the end
      this.storesWithInventory.sort((a: any, b: any) => {
        if (a.dist === "Infinity" && b.dist === "Infinity") return this.sortByNameLogic(a, b);  //If both stores have "Infinity" distance, sorts them alphabetically by store name
        if (a.dist === "Infinity") return 1;  //If only store 'a' has "Infinity" distance, moves it to the end.
        if (b.dist === "Infinity") return -1;  //If only store 'b' has "Infinity" distance, moves it to the end.
        return a.dist - b.dist;  //For stores with numeric distances, sorts them in ascending order.
      });
    },
    // method to sort the stores by name
    sortByName() {
      this.sortBy = 'name';
      this.storesWithInventory.sort((a: any, b: any) => this.sortByNameLogic(a, b));
    },
    // method to run the current filter to maintain the current sort type when toggling empty stock toggle
    runCurrentFilter() {
      if (this.sortBy === 'distance') {
        this.sortByDistance();
      } else if (this.sortBy === 'name') {
        this.sortByName();
      }
    },
    // method to handle empty stock toggle
    toggleHideEmptyStock() {
      this.hideEmptyStores = !this.hideEmptyStores;
      if (this.hideEmptyStores) {
        this.storesWithInventory = this.storesWithInventory.filter((store: any) => store.stock > 0);
      } else {
        this.storesWithInventory = this.mapStock(this.storesInventory, this.storesInformation);
      }
      this.runCurrentFilter();   // Run the current filter to maintain the current sort type
    },
    getCurrentWeekday() {
      const today = DateTime.now() // Get weekday index (1-7, Monday is 1, Sunday is 7)
      const weekdayIndex = today.weekday // Convert to 0-6 index (Sunday is 0, Monday is 1)
      const momentWeekday = weekdayIndex === 7 ? 0 : weekdayIndex
      return momentWeekday
    },
    // method to get the store hours status
    getStoreHoursStatus(store: any) {
      const currentDay = this.weekArray[this.getCurrentWeekday()];
      const hasCalendar = Object.keys(store).some(key => /_open$|_close$/.test(key));

      // Case 1: No calendar at all - return empty
      if (!hasCalendar) {
        return { display: '', isOpen: false };
      }

      const openKey = `${currentDay}_open`;
      const closeKey = `${currentDay}_close`;

      // Case 2: Has calendar and today's hours
      if (store[openKey] && store[closeKey]) {
        const now = DateTime.now();
        const openTime = DateTime.fromFormat(store[openKey], 'HH:mm:ss');
        const closeTime = DateTime.fromFormat(store[closeKey], 'HH:mm:ss');

        const openDisplay = openTime.toFormat('hh:mm a').toLowerCase();
        const closeDisplay = closeTime.toFormat('hh:mm a').toLowerCase();

        const isOpen = now >= openTime && now <= closeTime;

        return {
          display: isOpen ? `${translate("Open")} ${openDisplay} - ${closeDisplay}` : translate("Closed"),
          isOpen
        };
      }

      // Case 3: Has calendar but no hours for today
      else return {
        display: translate("Closed"),
        isOpen: false
      };
    },
    hasWeekCalendar(store: any): boolean {
      return Object.keys(store).some(key => /_open$|_close$/.test(key));
    },
    formatTime(time: string): string {
      return DateTime.fromFormat(time, 'HH:mm:ss').toFormat('h:mm a');
    },
  },
  setup() {
    const store = useStore();
    const userStore = useUserStore();
    let currentFacility: any = computed(() => userStore.getCurrentFacility);
    return {
      close,
      locationOutline,
      textOutline,
      store,
      translate,
      chevronDownOutline,
      currentFacility
    };
  }
});
</script>