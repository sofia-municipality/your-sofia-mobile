import React, {forwardRef, useImperativeHandle} from 'react'
import {View, Text, TextInput, TouchableOpacity, ScrollView} from 'react-native'
import {useForm, Controller} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useTranslation} from 'react-i18next'
import {Info} from 'lucide-react-native'
import {
  wasteContainerFormSchema,
  type WasteContainerFormData,
  type WasteContainerFormProps,
} from './schema'
import {styles} from './wasteContainer.styles'
import type {WasteType, CapacitySize} from '../../types/wasteContainer'

export const WasteContainerForm = forwardRef<any, WasteContainerFormProps>(
  (
    {container, onSubmit, onCancel, isSubmitting = false, isEditing = true, canEdit = false},
    ref
  ) => {
    const {t} = useTranslation()

    const {
      control,
      handleSubmit,
      formState: {errors},
      watch,
    } = useForm<WasteContainerFormData>({
      resolver: zodResolver(wasteContainerFormSchema),
      defaultValues: container
        ? {
            publicNumber: container.publicNumber || '',
            wasteType: container.wasteType || 'general',
            capacityVolume: container.capacityVolume || 1.0,
            capacitySize: container.capacitySize || 'standard',
            binCount: container.binCount || 1,
            location: {
              latitude: container.location.latitude,
              longitude: container.location.longitude,
              address: container.location.address || '',
            },
            notes: container.notes || '',
          }
        : {
            publicNumber: '',
            wasteType: 'general',
            capacityVolume: 1.0,
            capacitySize: 'standard',
            binCount: 1,
            location: {
              latitude: 42.6977,
              longitude: 23.3219,
              address: '',
            },
            notes: '',
          },
    })

    // Expose handleSubmit to parent component
    useImperativeHandle(ref, () => ({
      handleSubmit,
    }))

    const wasteType = watch('wasteType')
    const capacitySize = watch('capacitySize')

    const wasteTypes: {value: WasteType; label: string}[] = [
      {value: 'general', label: t('wasteContainers.type.general')},
      {value: 'recyclables', label: t('wasteContainers.type.recyclables')},
      {value: 'organic', label: t('wasteContainers.type.organic')},
      {value: 'glass', label: t('wasteContainers.type.glass')},
      {value: 'paper', label: t('wasteContainers.type.paper')},
      {value: 'plastic', label: t('wasteContainers.type.plastic')},
      {value: 'metal', label: t('wasteContainers.type.metal')},
    ]

    const capacitySizes: {value: CapacitySize; label: string}[] = [
      {value: 'tiny', label: t('wasteContainers.size.tiny')},
      {value: 'small', label: t('wasteContainers.size.small')},
      {value: 'standard', label: t('wasteContainers.size.standard')},
      {value: 'big', label: t('wasteContainers.size.big')},
      {value: 'industrial', label: t('wasteContainers.size.industrial')},
    ]

    const renderField = (
      name: string,
      label: string,
      placeholder: string,
      options?: {
        multiline?: boolean
        keyboardType?: 'default' | 'numeric' | 'decimal-pad'
      }
    ) => {
      const error = name.includes('.')
        ? (errors as any)[name.split('.')[0]]?.[name.split('.')[1]]
        : (errors as any)[name]

      return (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{label}</Text>
          {isEditing && canEdit ? (
            <Controller
              control={control}
              name={name as any}
              render={({field: {onChange, value}}) => (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      error && styles.inputError,
                      options?.multiline && styles.textArea,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={value?.toString() || ''}
                    onChangeText={(text) => {
                      if (
                        options?.keyboardType === 'numeric' ||
                        options?.keyboardType === 'decimal-pad'
                      ) {
                        const num = parseFloat(text)
                        onChange(isNaN(num) ? 0 : num)
                      } else {
                        onChange(text)
                      }
                    }}
                    multiline={options?.multiline}
                    numberOfLines={options?.multiline ? 4 : 1}
                    textAlignVertical={options?.multiline ? 'top' : 'center'}
                    keyboardType={options?.keyboardType || 'default'}
                    editable={!isSubmitting}
                  />
                  {error && <Text style={styles.errorText}>{t(error.message)}</Text>}
                </>
              )}
            />
          ) : (
            <Text style={styles.readOnlyValue}>{watch(name as any)?.toString() || '-'}</Text>
          )}
        </View>
      )
    }

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Public Number */}
        {renderField(
          'publicNumber',
          t('newCityObject.publicNumber'),
          t('newCityObject.publicNumberPlaceholder')
        )}

        {/* Waste Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.wasteType')}</Text>
          {isEditing && canEdit ? (
            <Controller
              control={control}
              name="wasteType"
              render={({field: {onChange, value}}) => (
                <View style={styles.selectContainer}>
                  {wasteTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.selectOption,
                        value === type.value && styles.selectOptionSelected,
                      ]}
                      onPress={() => onChange(type.value)}
                      disabled={isSubmitting}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          value === type.value && styles.selectOptionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          ) : (
            <Text style={styles.readOnlyValue}>
              {wasteTypes.find((t) => t.value === wasteType)?.label || '-'}
            </Text>
          )}
        </View>

        {/* Capacity Size */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.capacitySize')}</Text>
          {isEditing && canEdit ? (
            <Controller
              control={control}
              name="capacitySize"
              render={({field: {onChange, value}}) => (
                <View style={styles.selectContainer}>
                  {capacitySizes.map((size) => (
                    <TouchableOpacity
                      key={size.value}
                      style={[
                        styles.selectOption,
                        value === size.value && styles.selectOptionSelected,
                      ]}
                      onPress={() => onChange(size.value)}
                      disabled={isSubmitting}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          value === size.value && styles.selectOptionTextSelected,
                        ]}
                      >
                        {size.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          ) : (
            <Text style={styles.readOnlyValue}>
              {capacitySizes.find((s) => s.value === capacitySize)?.label || '-'}
            </Text>
          )}
        </View>

        {/* Capacity Volume */}
        {renderField('capacityVolume', t('newCityObject.capacityVolume'), '1.0', {
          keyboardType: 'decimal-pad',
        })}

        {/* Bin Count */}
        {renderField('binCount', t('newCityObject.binCount'), '1', {keyboardType: 'numeric'})}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.location')}</Text>

          {/* Info about location */}
          {isEditing && canEdit && (
            <View style={styles.infoRow}>
              <Info size={16} color="#1E40AF" />
              <Text style={styles.infoText}>{t('newCityObject.locationInfo')}</Text>
            </View>
          )}

          <View style={styles.locationRow}>
            <View style={styles.locationInput}>
              {renderField('location.latitude', t('newCityObject.latitude'), '42.6977', {
                keyboardType: 'decimal-pad',
              })}
            </View>
            <View style={styles.locationInput}>
              {renderField('location.longitude', t('newCityObject.longitude'), '23.3219', {
                keyboardType: 'decimal-pad',
              })}
            </View>
          </View>

          {renderField(
            'location.address',
            t('newCityObject.address'),
            t('newCityObject.addressPlaceholder')
          )}
        </View>

        {/* Notes */}
        {renderField('notes', t('newCityObject.notes'), t('newCityObject.notesPlaceholder'), {
          multiline: true,
        })}

        {/* Action Buttons */}
        {isEditing && canEdit && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? t('newCityObject.submitting')
                  : container
                    ? t('newCityObject.update')
                    : t('newCityObject.create')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    )
  }
)

WasteContainerForm.displayName = 'WasteContainerForm'
