import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {LanguageSwitch} from '../../components/LanguageSwitch'

const mockChangeLanguage = jest.fn()
let mockLanguage = 'bg'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {language: mockLanguage, changeLanguage: mockChangeLanguage},
  }),
}))

describe('LanguageSwitch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChangeLanguage.mockResolvedValue(undefined)
  })

  describe('when the current language is Bulgarian', () => {
    beforeEach(() => {
      mockLanguage = 'bg'
    })

    it('offers switching to English', async () => {
      await render(<LanguageSwitch />)

      const button = screen.getByRole('button', {name: 'Switch to English'})
      expect(button).toHaveTextContent('EN')
    })

    it('persists and applies English on press', async () => {
      await render(<LanguageSwitch />)

      await fireEvent.press(screen.getByRole('button', {name: 'Switch to English'}))

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user-language', 'en')
      expect(mockChangeLanguage).toHaveBeenCalledWith('en')
    })

    it('persists the language before changing it', async () => {
      await render(<LanguageSwitch />)

      await fireEvent.press(screen.getByRole('button', {name: 'Switch to English'}))

      const setItemOrder = (AsyncStorage.setItem as jest.Mock).mock.invocationCallOrder[0]
      const changeOrder = mockChangeLanguage.mock.invocationCallOrder[0]
      expect(setItemOrder).toBeLessThan(changeOrder)
    })
  })

  describe('when the current language is English', () => {
    beforeEach(() => {
      mockLanguage = 'en'
    })

    it('offers switching to Bulgarian', async () => {
      await render(<LanguageSwitch />)

      const button = screen.getByRole('button', {name: 'Превключи на Български'})
      expect(button).toHaveTextContent('БГ')
    })

    it('persists and applies Bulgarian on press', async () => {
      await render(<LanguageSwitch />)

      await fireEvent.press(screen.getByRole('button', {name: 'Превключи на Български'}))

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user-language', 'bg')
      expect(mockChangeLanguage).toHaveBeenCalledWith('bg')
    })
  })

  it('switches to Bulgarian from any non-Bulgarian language', async () => {
    mockLanguage = 'de'
    await render(<LanguageSwitch />)

    await fireEvent.press(screen.getByRole('button', {name: 'Превключи на Български'}))

    expect(mockChangeLanguage).toHaveBeenCalledWith('bg')
  })
})
