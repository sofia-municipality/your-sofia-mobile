import React from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {X} from 'lucide-react-native'
import {MissionForm} from './MissionForm'
import type {MissionFormData} from './schema'
import {colors} from '@/styles/tokens'

interface MissionCreateModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: MissionFormData) => Promise<void>
  isSubmitting: boolean
  signalId?: string
  cityObject?: {
    type?: 'waste-container' | 'drinking-fountain' | 'street' | 'park' | 'building' | 'other'
    referenceId?: string
    name?: string
  }
  location?: {
    latitude?: number
    longitude?: number
    address?: string
  }
}

export function MissionCreateModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
  signalId,
  cityObject,
  location,
}: MissionCreateModalProps) {
  const {t} = useTranslation()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!isSubmitting) {
          onClose()
        }
      }}
    >
      <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)'}}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={{flex: 1, justifyContent: 'flex-end'}}
        >
          <SafeAreaView style={{flex: 1, justifyContent: 'flex-end'}}>
            <View
              style={{
                flex: 1,
                maxHeight: '95%',
                width: '100%',
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 16,
                paddingBottom: 24,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingBottom: 8,
                }}
              >
                <View style={{flex: 1}}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 18,
                      fontWeight: '600',
                    }}
                  >
                    {t('missions.form.createMissionTitle')}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {t('missions.form.createMissionSubtitle')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  style={{padding: 8}}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{flex: 1}}>
                <MissionForm
                  onSubmit={onSubmit}
                  onCancel={onClose}
                  isSubmitting={isSubmitting}
                  signalId={signalId}
                  cityObject={cityObject}
                  location={location}
                />
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
