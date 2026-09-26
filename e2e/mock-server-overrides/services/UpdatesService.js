const Service = require('./Service')

// The home screen's primary feed (useUpdates -> fetchNewsUpdates) and its
// category chips (useUpdateCategories -> fetchUpdateSources) both validate
// the response with a strict Zod schema (lib/updatesSchema.ts) — the
// generated stub's echoed-params response fails that validation outright
// and surfaces as a visible error banner on the home screen, which sits in
// the middle of every test's navigation chain. Empty lists are enough:
// no E2E scenario in this epic needs real update content.

/**
 * Fetch a single update message by id
 *
 * id String
 * returns UpdateByIdResponse
 * */
const getUpdateById = () =>
  new Promise((resolve, reject) => {
    try {
      reject(Service.rejectResponse({message: 'Not found'}, 404))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

/**
 * List the sources feeding the city update feed
 *
 * returns UpdatesSourcesResponse
 * */
const listUpdateSources = () =>
  new Promise((resolve, reject) => {
    try {
      resolve(Service.successResponse({sources: []}))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

/**
 * List city-feed update messages, optionally filtered by viewport/categories
 *
 * returns UpdatesResponse
 * */
const listUpdates = () =>
  new Promise((resolve, reject) => {
    try {
      resolve(Service.successResponse({messages: []}))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

module.exports = {
  getUpdateById,
  listUpdateSources,
  listUpdates,
}
