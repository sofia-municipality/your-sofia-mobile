import React from 'react'
import {render, screen} from '@testing-library/react-native'
import PaymentsScreen from '../../../app/(tabs)/payments'
import en from '../../../translations/en'
import bg from '../../../translations/bg'
import {colors} from '../../../styles/tokens'

const mockUsedKeys = new Set<string>()

jest.mock('react-i18next', () => {
  const t = (key: string) => {
    mockUsedKeys.add(key)
    return key
  }
  return {useTranslation: () => ({t})}
})

const BILLS = [
  ['payments.bills.electricity', '124.50 лв', 'payments.common.due Jan 15'],
  ['payments.bills.waterSewer', '89.20 лв', 'payments.common.due Jan 20'],
  ['payments.bills.propertyTax', '450.00 лв', 'payments.common.due Feb 1'],
  ['payments.bills.parkingFines', '25.00 лв', 'payments.status.overdue'],
] as const

const OVERDUE = {borderLeftWidth: 4, borderLeftColor: colors.error}

/** The card of a bill: title → info column → content row → card. */
const billCard = (title: string) => screen.getAllByText(title)[0].parent!.parent!.parent!

describe('PaymentsScreen', () => {
  it('lists the outstanding bills with their amount and due date', async () => {
    await render(<PaymentsScreen />)

    for (const [title, amount, due] of BILLS) {
      expect(billCard(title)).toHaveTextContent(new RegExp(`${due}.*${amount}`))
    }
  })

  it('shows a total that matches the outstanding bills', async () => {
    await render(<PaymentsScreen />)

    const sum = BILLS.reduce((total, [, amount]) => total + parseFloat(amount), 0)
    expect(screen.getByText(`Общо: ${sum.toFixed(2)} лв`)).toBeOnTheScreen()
  })

  it('marks only the overdue bill', async () => {
    await render(<PaymentsScreen />)

    expect(billCard('payments.bills.parkingFines')).toHaveStyle(OVERDUE)
    expect(screen.getByText('payments.status.overdue')).toHaveStyle({color: colors.error})
    for (const [title] of BILLS.slice(0, 3)) {
      expect(billCard(title)).not.toHaveStyle(OVERDUE)
    }
  })

  it('lists the recent payments as paid', async () => {
    await render(<PaymentsScreen />)

    expect(screen.getByText('payments.common.recentPayments')).toBeOnTheScreen()
    for (const amount of ['-98.30 лв', '-76.45 лв', '-35.00 лв']) {
      expect(screen.getByText(amount)).toBeOnTheScreen()
    }
    expect(screen.getAllByText('payments.status.paid')).toHaveLength(3)
  })

  it('shows the accepted payment methods', async () => {
    await render(<PaymentsScreen />)

    expect(screen.getByText('payments.common.paymentMethods')).toBeOnTheScreen()
    expect(screen.getByText('payments.common.debitCreditCard')).toBeOnTheScreen()
    expect(screen.getByText('payments.common.cardsAccepted')).toBeOnTheScreen()
  })

  it('has an English and a Bulgarian text for every key it uses', async () => {
    await render(<PaymentsScreen />)
    const lookup = (dict: object, key: string) =>
      key.split('.').reduce<any>((node, part) => node?.[part], dict)

    const missing = [...mockUsedKeys].filter(
      (key) => typeof lookup(en, key) !== 'string' || typeof lookup(bg, key) !== 'string'
    )

    expect(mockUsedKeys.size).toBeGreaterThan(8)
    expect(missing).toEqual([])
  })
})
