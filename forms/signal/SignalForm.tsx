import React, {forwardRef, useImperativeHandle} from 'react'
import {View, Text, TextInput, TouchableOpacity, ScrollView, Image} from 'react-native'
import {useForm, Controller} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useTranslation} from 'react-i18next'
import {MapPin, Calendar, FileText, Tag, AlertCircle} from 'lucide-react-native'
import {signalFormSchema, type SignalFormData, type SignalFormProps} from './schema'
import {styles} from './signal.styles'
import {CONTAINER_STATES, getStateColor} from '../../types/wasteContainer'
import type {Signal} from '../../types/signal'

export const SignalForm = forwardRef<any, SignalFormProps>(
  ({signal, onSubmit, onCancel, isSubmitting = false, isEditing = true, canEdit = false}, ref) => {
    const {t, i18n} = useTranslation()

    const {
      control,
      handleSubmit,
      formState: {errors},
      setValue,
      watch,
    } = useForm<SignalFormData>({
      resolver: zodResolver(signalFormSchema),
      defaultValues: {
        title: signal.title || '',
        description: signal.description || '',
        containerState: signal.containerState || [],
      },
    })

    // Expose handleSubmit to parent component
    useImperativeHandle(ref, () => ({
      handleSubmit,
    }))

    const selectedStates = watch('containerState') || []

    const toggleState = (state: string) => {
      const newStates = selectedStates.includes(state)
        ? selectedStates.filter((s) => s !== state)
        : [...selectedStates, state]
      setValue('containerState', newStates)
    }

    const getStatusIcon = (status: Signal['status']) => {
      const iconProps = {size: 20}
      switch (status) {
        case 'pending':
          return <AlertCircle {...iconProps} color="#F59E0B" />
        case 'in-progress':
          return <AlertCircle {...iconProps} color="#3B82F6" />
        case 'resolved':
          return <AlertCircle {...iconProps} color="#10B981" />
        case 'rejected':
          return <AlertCircle {...iconProps} color="#EF4444" />
        default:
          return null
      }
    }

    const getStatusColor = (status: Signal['status']) => {
      const colors = {
        pending: '#F59E0B',
        'in-progress': '#3B82F6',
        resolved: '#10B981',
        rejected: '#EF4444',
      }
      return colors[status] || '#6B7280'
    }

    return (
      <View>
        {/* Status and Category Badges */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <View
            style={[styles.statusBadge, {backgroundColor: `${getStatusColor(signal.status)}20`}]}
          >
            {getStatusIcon(signal.status)}
            <Text style={[styles.statusText, {color: getStatusColor(signal.status)}]}>
              {t(`signals.status.${signal.status}`)}
            </Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Tag size={16} color="#6B7280" />
            <Text style={styles.categoryText}>{t(`signals.categories.${signal.category}`)}</Text>
          </View>
        </View>

        {/* Title */}
        {isEditing ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.form.title')}</Text>
            <Controller
              control={control}
              name="title"
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('signals.form.titlePlaceholder')}
                  editable={!isSubmitting}
                />
              )}
            />
            {errors.title && <Text style={styles.errorText}>{t(errors.title.message || '')}</Text>}
          </View>
        ) : null}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('signals.form.description')}</Text>
          {isEditing ? (
            <Controller
              control={control}
              name="description"
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('signals.form.descriptionPlaceholder')}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />
              )}
            />
          ) : (
            <Text style={styles.descriptionText}>
              {signal.description || t('signals.form.noDescription')}
            </Text>
          )}
        </View>

        {/* Container State */}
        {signal.category === 'waste-container' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.form.containerState')}</Text>
            <View style={styles.stateTagsContainer}>
              {isEditing
                ? CONTAINER_STATES.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.stateTag,
                        selectedStates.includes(state) && {
                          backgroundColor: getStateColor(state),
                          borderColor: getStateColor(state),
                        },
                      ]}
                      onPress={() => toggleState(state)}
                      disabled={isSubmitting}
                    >
                      <Text
                        style={[
                          styles.stateTagText,
                          selectedStates.includes(state) && styles.stateTagTextSelected,
                        ]}
                      >
                        {t(`signals.containerStates.${state}`)}
                      </Text>
                    </TouchableOpacity>
                  ))
                : (signal.containerState || []).map((state) => (
                    <View
                      key={state}
                      style={[
                        styles.stateTag,
                        {
                          backgroundColor: getStateColor(state),
                          borderColor: getStateColor(state),
                        },
                      ]}
                    >
                      <Text style={styles.stateTagTextSelected}>
                        {t(`signals.containerStates.${state}`)}
                      </Text>
                    </View>
                  ))}
            </View>
          </View>
        )}

        {/* Images */}
        {!isEditing && signal.images && signal.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.form.photos')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imagesContainer}>
                {signal.images.map((image, index) => (
                  <Image
                    key={image.id || index}
                    source={{uri: image.url}}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* City Object */}
        {signal.cityObject?.name && (
          <View style={styles.section}>
            <View style={styles.metaRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.metaText}>{signal.cityObject.name}</Text>
            </View>
          </View>
        )}

        {/* Location */}
        {signal.location?.address && (
          <View style={styles.section}>
            <View style={styles.metaRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.metaText}>{signal.location.address}</Text>
            </View>
          </View>
        )}

        {/* Created Date */}
        <View style={styles.section}>
          <View style={styles.metaRow}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.metaText}>
              {new Date(signal.createdAt).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Admin Notes */}
        {signal.adminNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('signals.adminNotes')}</Text>
            <View style={styles.adminNotesContainer}>
              <FileText size={16} color="#1E40AF" />
              <Text style={styles.adminNotesText}>{signal.adminNotes}</Text>
            </View>
          </View>
        )}

        {/* Edit Permission Info */}
        {!canEdit && !isEditing && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{t('signals.cannotEdit')}</Text>
          </View>
        )}
      </View>
    )
  }
)

SignalForm.displayName = 'SignalForm'
