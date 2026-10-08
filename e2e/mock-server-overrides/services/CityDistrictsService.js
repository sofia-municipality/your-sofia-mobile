/* eslint-disable no-unused-vars */
const Service = require('./Service')
const {districts} = require('../fixtures')

/**
 * List Sofia city districts
 *
 * limit Integer  (optional)
 * sort String  (optional)
 * returns listCityDistricts_200_response
 * */
const listCityDistricts = ({limit, sort}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          docs: districts,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

module.exports = {
  listCityDistricts,
}
