const Service = require('./Service')

// Used by the one-time "what's new" screen (fetchNews) — an empty list is
// enough since no E2E scenario in this epic needs real news content, and
// the generated stub's echoed-params response doesn't match the
// docs/totalDocs pagination shape the client expects.

/**
 * Fetch a single news item
 *
 * id String
 * locale String  (optional)
 * returns PayloadNewsItem
 * */
const getNewsItem = () =>
  new Promise((resolve, reject) => {
    try {
      reject(Service.rejectResponse({message: 'Not found'}, 404))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

/**
 * List published news items
 *
 * limit Integer  (optional)
 * page Integer  (optional)
 * returns NewsList
 * */
const listNews = ({limit = 10, page = 1}) =>
  new Promise((resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          docs: [],
          totalDocs: 0,
          limit,
          page,
          totalPages: 0,
          pagingCounter: 0,
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

module.exports = {
  getNewsItem,
  listNews,
}
