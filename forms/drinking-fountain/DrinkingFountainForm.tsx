import React, {useEffect, useState} from 'react'
import {View, Text, TextInput, TouchableOpacity} from 'react-native'
import {useForm, Controller} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useTranslation} from 'react-i18next'
import {fetchCityDistricts, fetchFountainSources, fetchFountainStatuses} from '../../lib/payload'
import type {CityDistrict} from '../../types/subscription'
import type {FountainLookup} from '../../lib/payload'
import {styles} from '../waste-container'
import {colors} from '@/styles/tokens'
import {
  drinkingFountainFormSchema,
  type DrinkingFountainFormData,
  type DrinkingFountainFormProps,
} from './schema'

export function DrinkingFountainForm({
  initialLocation,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: DrinkingFountainFormProps) {
  const {t} = useTranslation()

  const [districts, setDistricts] = useState<CityDistrict[]>([])
  const [sources, setSources] = useState<FountainLookup[]>([])
  const [statuses, setStatuses] = useState<FountainLookup[]>([])

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors, dirtyFields},
  } = useForm<DrinkingFountainFormData>({
    resolver: zodResolver(drinkingFountainFormSchema),
    defaultValues: {
      address: '',
      isActive: true,
      location: {
        latitude: initialLocation?.latitude ?? 42.6977,
        longitude: initialLocation?.longitude ?? 23.3219,
      },
    },
  })

  // The lookup collections are small and publicly readable. Each is optional:
  // when one fails to load, its picker simply stays hidden.
  useEffect(() => {
    let mounted = true
    fetchCityDistricts()
      .then((data) => mounted && setDistricts(data))
      .catch((err) => console.error('Failed to load districts:', err))
    fetchFountainSources()
      .then((data) => mounted && setSources(data))
      .catch((err) => console.error('Failed to load fountain sources:', err))
    fetchFountainStatuses()
      .then((data) => mounted && setStatuses(data))
      .catch((err) => console.error('Failed to load fountain statuses:', err))
    return () => {
      mounted = false
    }
  }, [])

  // Follow GPS into the location fields until the user edits them manually.
  useEffect(() => {
    if (!initialLocation) return
    if (dirtyFields.location?.latitude || dirtyFields.location?.longitude) return
    setValue('location.latitude', initialLocation.latitude)
    setValue('location.longitude', initialLocation.longitude)
  }, [initialLocation, dirtyFields, setValue])

  const renderNumberField = (name: 'location.latitude' | 'location.longitude', label: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({field: {onChange, value}}) => (
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            value={value?.toString() || ''}
            onChangeText={(text) => {
              const num = parseFloat(text)
              onChange(isNaN(num) ? 0 : num)
            }}
            keyboardType="decimal-pad"
            editable={!isSubmitting}
          />
        )}
      />
    </View>
  )

  const renderLookupSelect = (
    name: 'district' | 'source' | 'status',
    label: string,
    options: {id: number | string; name: string}[]
  ) => {
    if (options.length === 0) return null
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Controller
          control={control}
          name={name}
          render={({field: {onChange, value}}) => (
            <View style={styles.selectContainer}>
              {options.map((option) => {
                const selected = value === option.id
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.selectOption, selected && styles.selectOptionSelected]}
                    onPress={() => onChange(selected ? undefined : option.id)}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[styles.selectOptionText, selected && styles.selectOptionTextSelected]}
                    >
                      {option.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('newCityObject.address')}</Text>
        <Controller
          control={control}
          name="address"
          render={({field: {onChange, value}}) => (
            <>
              <TextInput
                style={[styles.input, errors.address && styles.inputError]}
                placeholder={t('newCityObject.addressPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={onChange}
                editable={!isSubmitting}
              />
              {errors.address?.message && (
                <Text style={styles.errorText}>{t(errors.address.message)}</Text>
              )}
            </>
          )}
        />
      </View>

      {/* Working state */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('newCityObject.fountainIsActive')}</Text>
        <Controller
          control={control}
          name="isActive"
          render={({field: {onChange, value}}) => (
            <View style={styles.selectContainer}>
              {[
                {active: true, label: t('fountains.working')},
                {active: false, label: t('fountains.notWorking')},
              ].map((option) => (
                <TouchableOpacity
                  key={String(option.active)}
                  style={[
                    styles.selectOption,
                    value === option.active && styles.selectOptionSelected,
                  ]}
                  onPress={() => onChange(option.active)}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      value === option.active && styles.selectOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('newCityObject.location')}</Text>
        <View style={styles.locationRow}>
          <View style={styles.locationInput}>
            {renderNumberField('location.latitude', t('newCityObject.latitude'))}
          </View>
          <View style={styles.locationInput}>
            {renderNumberField('location.longitude', t('newCityObject.longitude'))}
          </View>
        </View>
      </View>

      {/* Optional lookups */}
      {renderLookupSelect('district', t('fountains.district'), districts)}
      {renderLookupSelect('source', t('fountains.source'), sources)}
      {renderLookupSelect('status', t('fountains.condition'), statuses)}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} disabled={isSubmitting}>
          <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? t('newCityObject.submitting') : t('newCityObject.create')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
