/* eslint-disable no-unused-vars */
const Service = require('./Service')
const {fixtureSignal} = require('../fixtures')

// Every signal-list query in this mock resolves to the same fixture set —
// good enough for the E2E scenarios that need it (issue #183: list -> detail
// -> back), which don't depend on filtering behaving correctly.
const allSignals = [fixtureSignal]
let nextSignalId = 1000

/**
 * Create a signal (optionally with an already-uploaded `Authorization` header for logged-in reporters)
 *
 * body SignalCreateRequest — express-openapi-validator dereferences the request
 * body schema before Controller.js resolves the param name, so the named
 * `signalCreateRequest` param is always undefined; the real key is `body`
 * (see AuthService.login for the same fix).
 * returns Signal
 * */
const createSignal = ({body}) =>
  new Promise(async (resolve, reject) => {
    try {
      const newSignal = {
        id: String(nextSignalId++),
        title: body.title,
        description: body.description || '',
        category: body.category,
        cityObject: body.cityObject,
        containerState: body.containerState,
        status: 'pending',
        reporter: body.reporterUniqueId || null,
        location: body.location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      allSignals.push(newSignal)
      resolve(Service.successResponse(newSignal))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Fetch a single signal
 *
 * id String
 * depth Integer  (optional)
 * returns Signal
 * */
const getSignal = ({id, depth}) =>
  new Promise(async (resolve, reject) => {
    try {
      const signal = allSignals.find((s) => String(s.id) === String(id))
      if (!signal) {
        reject(Service.rejectResponse({message: 'Not found'}, 404))
        return
      }
      resolve(Service.successResponse(signal))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * List signals (citizen reports)
 *
 * limit Integer  (optional)
 * page Integer  (optional)
 * depth Integer  (optional)
 * sort String  (optional)
 * whereLeft_Square_BracketstatusRight_Square_BracketLeft_Square_BracketequalsRight_Square_Bracket SignalStatus  (optional)
 * whereLeft_Square_BracketcategoryRight_Square_BracketLeft_Square_BracketequalsRight_Square_Bracket SignalCategory  (optional)
 * whereLeft_Square_BracketreporterUniqueIdRight_Square_BracketLeft_Square_BracketequalsRight_Square_Bracket String  (optional)
 * whereLeft_Square_BracketreporterRight_Square_BracketLeft_Square_BracketequalsRight_Square_Bracket Integer  (optional)
 * whereLeft_Square_BracketcityObjectPeriodreferenceIdRight_Square_BracketLeft_Square_BracketequalsRight_Square_Bracket String  (optional)
 * returns SignalList
 * */
const listSignals = ({limit = 20, page = 1}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          docs: allSignals,
          totalDocs: allSignals.length,
          limit,
          page,
          totalPages: 1,
          pagingCounter: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Update a signal (status transitions, admin notes, added photos, ...)
 *
 * id String
 * signalUpdateRequest SignalUpdateRequest
 * returns Signal
 * */
const updateSignal = ({id, signalUpdateRequest}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          id,
          signalUpdateRequest,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

module.exports = {
  createSignal,
  getSignal,
  listSignals,
  updateSignal,
}
