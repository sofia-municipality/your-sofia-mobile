/* eslint-disable no-unused-vars */
const Service = require('./Service')
const {testUser, testPassword, testToken} = require('../fixtures')

/**
 * Permanently delete the authenticated user's account
 *
 * no response value expected for this operation
 * */
const deleteAccount = () =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(Service.successResponse({}))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Request a password-reset email
 *
 * forgotPasswordRequest ForgotPasswordRequest
 * no response value expected for this operation
 * */
const forgotPassword = ({forgotPasswordRequest}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          forgotPasswordRequest,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Fetch the authenticated user
 *
 * returns getCurrentUser_200_response
 * */
const getCurrentUser = () =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(Service.successResponse({}))
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Log in with email + password
 *
 * loginRequest LoginRequest
 * returns LoginResponse
 * */
// Destructures `body`, not `loginRequest`: express-openapi-validator
// dereferences all $refs before Controller.getRequestBodyName() runs, so its
// `schema.$ref` check never matches and it always falls back to the generic
// 'body' key — true for every generated service in this mock, not just this
// one. Verified directly against a bare validator instance.
const login = ({body}) =>
  new Promise(async (resolve, reject) => {
    try {
      const email = body && body.email
      const password = body && body.password
      if (email !== testUser.email || password !== testPassword) {
        reject(Service.rejectResponse({message: 'Невалиден имейл или парола'}, 401))
        return
      }
      resolve(
        Service.successResponse({
          token: testToken,
          user: testUser,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Register a new user
 *
 * registerRequest RegisterRequest
 * returns User
 * */
const register = ({registerRequest}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          registerRequest,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })
/**
 * Resend the account-verification email
 *
 * resendVerificationRequest ResendVerificationRequest
 * no response value expected for this operation
 * */
const resendVerificationEmail = ({resendVerificationRequest}) =>
  new Promise(async (resolve, reject) => {
    try {
      resolve(
        Service.successResponse({
          resendVerificationRequest,
        })
      )
    } catch (e) {
      reject(Service.rejectResponse(e.message || 'Invalid input', e.status || 405))
    }
  })

module.exports = {
  deleteAccount,
  forgotPassword,
  getCurrentUser,
  login,
  register,
  resendVerificationEmail,
}
