/* eslint-disable no-unused-vars */
const Service = require('./Service')
const {subscriptionsByToken, nextSubscriptionId} = require('../fixtures')

/**
 * Create a notification subscription for a push token
 *
 * createSubscriptionInput CreateSubscriptionInput
 * returns createSubscription_201_response
 * */
const createSubscription = ({createSubscriptionInput}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          createSubscriptionInput,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Fetch the subscription tied to a push token
 *
 * token String
 * returns getMySubscription_200_response
 * */
const getMySubscription = ({token}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          subscription: subscriptionsByToken.get(token) || null,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Upsert the subscription tied to a push token (validates device ownership)
 *
 * token String
 * updateSubscriptionInput UpdateSubscriptionInput
 * returns createSubscription_201_response
 * */
// Destructures `body`, not `updateSubscriptionInput` — see the comment on
// AuthService.login for why every generated service's named body param
// actually arrives under the generic `body` key instead.
const updateMySubscription = ({token, body}) =>
  new Promise(async (resolve, reject) => {
    try {
      const input = body || {}
      const existing = subscriptionsByToken.get(token)
      const now = new Date().toISOString()
      const categories = (input.categories || []).map((slug) => ({
        id: null,
        title: String(slug),
        slug: String(slug),
      }))
      const locationFilters = (input.locationFilters || []).map((filter, index) => ({
        id: `mock-filter-${index}`,
        ...filter,
      }))
      const previouslyEnabled = existing ? existing.enabled : true
      const enabled = input.enabled !== undefined ? input.enabled : previouslyEnabled
      const updated = {
        id: existing ? existing.id : nextSubscriptionId(),
        enabled,
        pushToken: token,
        user: existing ? existing.user : null,
        categories,
        locationFilters,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      }
      subscriptionsByToken.set(token, updated)
      resolve(
        Service.successResponse({
          doc: updated,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Update a subscription by id (authenticated users, e.g. linking to their account)
 *
 * id String
 * updateSubscriptionInput UpdateSubscriptionInput
 * returns createSubscription_201_response
 * */
const updateSubscription = ({id, updateSubscriptionInput}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          id,
          updateSubscriptionInput,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

module.exports = {
  createSubscription,
  getMySubscription,
  updateMySubscription,
  updateSubscription,
}
