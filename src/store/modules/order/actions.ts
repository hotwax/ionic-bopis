import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError , showToast } from "@/utils";
import { translate } from "@/i18n";
import emitter from '@/event-bus'
import store from "@/store";

const actions: ActionTree<OrderState , RootState> ={
  async getOpenOrders({ dispatch, commit }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    try {
      const shippingOrdersStatus = store.state.user.shippingOrders;
      if(!shippingOrdersStatus){
        payload.inputFields.shipmentMethodTypeId= "STOREPICKUP"
      }
      resp = await OrderService.getOpenOrders(payload)
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        const orders = resp.data.docs
        const orderIds = orders.reduce((orderIds: any, order: any) => {
          if(orderIds){
            orderIds += ' OR '
          }
          orderIds += ("orderId: *" + order.orderId + "*")
          return orderIds 
        } , '')

        const query = {
          "json": {
            "params": {
              "rows": orders.length,
              "group": true,
              "group.field": "orderId",
              "group.ngroups": true,
              "group.limit": 1000,
            },
            "query": "*:*",
            "filter": [orderIds, "docType: ORDER"],
          }
        }
        await dispatch('getOpenOrderDetails', { query, viewIndex: payload.viewIndex });
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 })
        emitter.emit("dismissLoader");
        showToast(translate("Orders Not Found"))
      }
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }
    return resp;
  },

  async getOpenOrderDetails({ commit, state }, { query, viewIndex }) {
    const shippingOrdersStatus = store.state.user.shippingOrders;
    if (!shippingOrdersStatus) {
      query.json.filter.push("shipmentMethodTypeId: STOREPICKUP")
    }

    let resp;
    try {
      resp = await OrderService.getOrderDetails(query);
      if(resp.status == 200 && resp.data.grouped.orderId.groups?.length > 0 && !hasError(resp)) {
        let orders = resp.data.grouped.orderId.groups
        const total = resp.data.grouped.orderId.groups.length

        let productIds: any = new Set();
        orders.forEach((order: any) => {
          order.doclist.docs.forEach((item: any) => {
            if(item.productId) productIds.add(item.productId);
          })
        })
        productIds = [...productIds]
        if (productIds.length) {
          this.dispatch('product/fetchProducts', { productIds })
          this.dispatch('stock/addProducts', { productIds })
        }

        orders.map((order: any) => {
          order.orderId = order.doclist?.docs[0].orderId,
          order.orderName = order.doclist?.docs[0].orderName,
          order.customer = { name : order.doclist?.docs[0].customerPartyName },
          order.items = order.doclist?.docs,
          order.statusId = order.doclist?.docs[0].orderStatusId,
          order.date = order.doclist?.docs[0].orderDate,
          order.email = order.doclist?.docs[0].customerEmailId,
          order.phoneNumber = order.doclist?.docs[0].phoneNumber
        })

        if(viewIndex && viewIndex > 0) orders = state.open.list.concat(orders)
        commit(types.ORDER_OPEN_UPDATED, { orders, total })
      } else {
        commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }
  },

  async getOrderDetail( { dispatch, state }, { payload, orderId, shipmentMethod } ) {
    const current = state.current as any
    const orders = state.open.list as any
    if(current.orderId === orderId) { return current }

    if(orders.length) {
      const order = orders.find((order: any) => {
        return order.orderId === orderId;
      })
      if(order) {
        dispatch('updateCurrent', { order, shipmentMethod })
        return order;
      }
    }
    
    let resp;
    try {
      resp = await OrderService.getOrderDetails(payload)
      if (resp.status == 200 && resp.data.grouped.orderId.groups?.length > 0 && !hasError(resp)) {
        const orders = resp.data.grouped.orderId.groups

        let productIds: any = new Set();
        orders.forEach((order: any) => {
          order.doclist.docs.forEach((item: any) => {
            if(item.productId) productIds.add(item.productId);
          })
        })
        productIds = [...productIds]
        if (productIds.length) {
          this.dispatch('product/fetchProducts', { productIds })
          this.dispatch('stock/addProducts', { productIds })
        }

        const order = {
          orderId : orders[0].doclist?.docs[0].orderId,
          orderName : orders[0].doclist?.docs[0].orderName,
          customer : { name: orders[0].doclist?.docs[0].customerPartyName },
          items : orders[0].doclist?.docs,
          statusId : orders[0].doclist?.docs[0].orderStatusId,
          date : orders[0].doclist?.docs[0].orderDate,
          email : orders[0].doclist?.docs[0].customerEmailId,
          phoneNumber : orders[0].doclist?.docs[0].phoneNumber
        }

        dispatch('updateCurrent', { order, shipmentMethod })
      } else {
        showToast(translate("Order not found"))
      }
    } catch (err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }
    return resp
  },

  updateCurrent ({ commit }, payload) {
    const order = payload.order
    const items = order.items.filter((item: any) => {
      return item.shipmentMethodTypeId === payload.shipmentMethod
    })
    order.items = items

    commit(types.ORDER_CURRENT_UPDATED, { order })
  },

  async getPackedOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    try {
      resp = await OrderService.getPackedOrders(payload)
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let orders = resp.data.docs;

        this.dispatch('product/getProductInformation', { orders })

        const total = resp.data.count;
        if(payload.viewIndex && payload.viewIndex > 0) orders = state.packed.list.concat(orders)
        commit(types.ORDER_PACKED_UPDATED, { orders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_PACKED_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async deliverShipment ({ dispatch }, order) {
    emitter.emit("presentLoader");

    const params = {
      shipmentId: order.shipmentId,
      statusId: 'SHIPMENT_SHIPPED'
    }

    let resp;

    try {
      resp = await OrderService.updateShipment(params)
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate('Order delivered to', {customerName: order.customerName}))
      } else {
        showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  async packDeliveryItems ({ commit }, shipmentId) {
    const params = {
      shipmentId: shipmentId,
      statusId: 'SHIPMENT_PACKED'
    }
    return await OrderService.updateShipment(params)
  },

  async quickShipEntireShipGroup ({ dispatch }, payload) {
    emitter.emit("presentLoader")

    const params = {
      orderId: payload.order.orderId,
      setPackedOnly: 'Y',
      dimensionUomId: 'WT_kg',
      shipmentBoxTypeId: 'YOURPACKNG',
      weight: '1',
      weightUomId: 'WT_kg',
      facilityId: payload.facilityId,
      shipGroupSeqId: payload.shipGroupSeqId
    }
    
    let resp;

    try {
      resp = await OrderService.quickShipEntireShipGroup(params)
      if (resp.status === 200 && !hasError(resp) && resp.data._EVENT_MESSAGE_) {
        /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
          Because we get the shipmentMethodTypeId on items level in wms-orders API.
          As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
        */
        const shipmentMethodTypeId = payload.order.items.find((ele: any) => ele.shipGroupSeqId == payload.shipGroupSeqId).shipmentMethodTypeId
        if (shipmentMethodTypeId !== 'STOREPICKUP') {
          // TODO: find a better way to get the shipmentId
          const shipmentId = resp.data._EVENT_MESSAGE_.match(/\d+/g)[0]
          await dispatch('packDeliveryItems', shipmentId).then((data) => {
            if (!hasError(data) && !data.data._EVENT_MESSAGE_) showToast(translate("Something went wrong"))
          })
        }
        showToast(translate("Order packed and ready for delivery"))
      } else {
        showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  // TODO: handle the unfillable items count
  async setUnfillableOrderOrItem ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    return await dispatch("rejectOrderItems", payload).then((resp) => {
      const refreshPickupOrders = resp.find((response: any) => !(response.data._ERROR_MESSAGE_ || response.data._ERROR_MESSAGE_LIST_))
      if (refreshPickupOrders) {
        showToast(translate('All items were canceled from the order') + ' ' + payload.orderId);
      } else {
        showToast(translate('Something went wrong'));
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  },

  rejectOrderItems ({ commit }, data) {
    const payload = {
      'orderId': data.orderId
    }

    return Promise.all(data.items.map((item: any) => {
      const params = {
        ...payload,
        'rejectReason': item.reason,
        'facilityId': item.facilityId,
        'orderItemSeqId': item.orderItemSeqId,
        'shipmentMethodTypeId': item.shipmentMethodTypeId,
        'quantity': parseInt(item.quantity)
      }
      return OrderService.rejectOrderItem({'payload': params}).catch((err) => { 
        return err;
      })
    }))
  },

  // clearning the orders state when logout, or user store is changed
  clearOrders ({ commit }) {
    commit(types.ORDER_OPEN_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_PACKED_UPDATED, {orders: {} , total: 0})
  }
}

export default actions;
