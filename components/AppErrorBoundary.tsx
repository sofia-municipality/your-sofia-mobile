import React, {Component, ErrorInfo, ReactNode} from 'react'
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native'
import * as Sentry from '@sentry/react-native'
import i18n from '../i18n'
import {colors, fonts, fontSizes} from '@/styles/tokens'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return {hasError: true}
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Unhandled error:', error)
    console.error('[AppErrorBoundary] Error info:', errorInfo)
    Sentry.captureException(error, {
      contexts: {react: {componentStack: errorInfo.componentStack}},
    })
  }

  handleRetry = () => {
    this.setState({hasError: false})
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{i18n.t('common.error')}</Text>
          <Text style={styles.message}>{i18n.t('common.unexpectedErrorMessage')}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>{i18n.t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: colors.surface,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
})
