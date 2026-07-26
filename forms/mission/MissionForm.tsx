import React from 'react'
import {View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator} from 'react-native'
import {Controller, useFieldArray, useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {useTranslation} from 'react-i18next'
import {missionFormSchema, type MissionFormData, type MissionFormProps} from './schema'
import {styles} from './mission.styles'

const LEVEL_OPTIONS: {value: MissionFormData['level']; key: string}[] = [
  {value: 'good-first-mission', key: 'missions.levels.goodFirstMission'},
  {value: 'verified-contributor', key: 'missions.levels.verifiedContributor'},
  {value: 'verified-guardian', key: 'missions.levels.verifiedGuardian'},
]

const STATUS_OPTIONS: {value: MissionFormData['status']; key: string}[] = [
  {value: 'draft', key: 'missions.status.draft'},
  {value: 'open', key: 'missions.status.open'},
]

export function MissionForm({onSubmit, onCancel, isSubmitting = false}: MissionFormProps) {
  const {t} = useTranslation()

  const {
    control,
    handleSubmit,
    formState: {errors},
    watch,
  } = useForm<MissionFormData>({
    resolver: zodResolver(missionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      level: 'good-first-mission',
      status: 'draft',
      pointsReward: 10,
      generalInstructions: '',
      tasks: [
        {
          title: '',
          instructions: '',
          acceptanceCriteria: '',
          requiresBeforePhoto: true,
          requiresAfterPhoto: true,
        },
      ],
    },
  })

  const {fields, append, remove} = useFieldArray({
    control,
    name: 'tasks',
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('missions.form.title')}</Text>
        <Controller
          control={control}
          name="title"
          render={({field: {onChange, onBlur, value}}) => (
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t('missions.form.titlePlaceholder')}
              editable={!isSubmitting}
            />
          )}
        />
        {errors.title ? (
          <Text style={styles.errorText}>{t(errors.title.message || '')}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('missions.form.description')}</Text>
        <Controller
          control={control}
          name="description"
          render={({field: {onChange, onBlur, value}}) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t('missions.form.descriptionPlaceholder')}
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
            />
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('missions.form.level')}</Text>
        <Controller
          control={control}
          name="level"
          render={({field: {onChange, value}}) => (
            <View style={styles.chipsRow}>
              {LEVEL_OPTIONS.map((option) => {
                const selected = value === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => onChange(option.value)}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {t(option.key)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('missions.form.status')}</Text>
        <Controller
          control={control}
          name="status"
          render={({field: {onChange, value}}) => (
            <View style={styles.chipsRow}>
              {STATUS_OPTIONS.map((option) => {
                const selected = value === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => onChange(option.value)}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {t(option.key)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('missions.form.pointsReward')}</Text>
        <Controller
          control={control}
          name="pointsReward"
          render={({field: {onChange, onBlur, value}}) => (
            <TextInput
              style={[styles.input, errors.pointsReward && styles.inputError]}
              value={String(value ?? '')}
              onChangeText={(text) => onChange(text)}
              onBlur={onBlur}
              keyboardType="numeric"
              placeholder={t('missions.form.pointsRewardPlaceholder')}
              editable={!isSubmitting}
            />
          )}
        />
        {errors.pointsReward ? (
          <Text style={styles.errorText}>{t(errors.pointsReward.message || '')}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('missions.form.generalInstructions')}</Text>
        <Controller
          control={control}
          name="generalInstructions"
          render={({field: {onChange, onBlur, value}}) => (
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                errors.generalInstructions && styles.inputError,
              ]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t('missions.form.generalInstructionsPlaceholder')}
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
            />
          )}
        />
        {errors.generalInstructions ? (
          <Text style={styles.errorText}>{t(errors.generalInstructions.message || '')}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('missions.form.tasks')}</Text>

        {fields.map((task, index) => {
          const taskErrors = errors.tasks?.[index]
          const requiresBefore = watch(`tasks.${index}.requiresBeforePhoto`)
          const requiresAfter = watch(`tasks.${index}.requiresAfterPhoto`)

          return (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>
                  {t('missions.form.task')} {index + 1}
                </Text>
                {fields.length > 1 ? (
                  <TouchableOpacity
                    style={styles.removeTaskButton}
                    onPress={() => remove(index)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.removeTaskButtonText}>{t('missions.form.removeTask')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Controller
                control={control}
                name={`tasks.${index}.title`}
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    style={[styles.input, taskErrors?.title && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('missions.form.taskTitlePlaceholder')}
                    editable={!isSubmitting}
                  />
                )}
              />
              {taskErrors?.title ? (
                <Text style={styles.errorText}>{t(taskErrors.title.message || '')}</Text>
              ) : null}

              <Controller
                control={control}
                name={`tasks.${index}.instructions`}
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      taskErrors?.instructions && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('missions.form.taskInstructionsPlaceholder')}
                    multiline
                    numberOfLines={3}
                    editable={!isSubmitting}
                  />
                )}
              />
              {taskErrors?.instructions ? (
                <Text style={styles.errorText}>{t(taskErrors.instructions.message || '')}</Text>
              ) : null}

              <Controller
                control={control}
                name={`tasks.${index}.acceptanceCriteria`}
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      taskErrors?.acceptanceCriteria && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('missions.form.taskAcceptanceCriteriaPlaceholder')}
                    multiline
                    numberOfLines={3}
                    editable={!isSubmitting}
                  />
                )}
              />
              {taskErrors?.acceptanceCriteria ? (
                <Text style={styles.errorText}>
                  {t(taskErrors.acceptanceCriteria.message || '')}
                </Text>
              ) : null}

              <View style={styles.taskToggleRow}>
                <Controller
                  control={control}
                  name={`tasks.${index}.requiresBeforePhoto`}
                  render={({field: {onChange, value}}) => (
                    <TouchableOpacity
                      style={[styles.taskToggle, value && styles.taskToggleSelected]}
                      onPress={() => onChange(!value)}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.taskToggleText, value && styles.taskToggleTextSelected]}>
                        {t('missions.form.requiresBeforePhoto')}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                <Controller
                  control={control}
                  name={`tasks.${index}.requiresAfterPhoto`}
                  render={({field: {onChange, value}}) => (
                    <TouchableOpacity
                      style={[styles.taskToggle, value && styles.taskToggleSelected]}
                      onPress={() => onChange(!value)}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.taskToggleText, value && styles.taskToggleTextSelected]}>
                        {t('missions.form.requiresAfterPhoto')}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {!requiresBefore && !requiresAfter ? (
                <Text style={styles.errorText}>{t('missions.form.atLeastOnePhotoRequired')}</Text>
              ) : null}
            </View>
          )
        })}

        {errors.tasks?.message ? (
          <Text style={styles.errorText}>{t(errors.tasks.message)}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.addTaskButton}
          onPress={() =>
            append({
              title: '',
              instructions: '',
              acceptanceCriteria: '',
              requiresBeforePhoto: true,
              requiresAfterPhoto: true,
            })
          }
          disabled={isSubmitting}
        >
          <Text style={styles.addTaskText}>{t('missions.form.addTask')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} disabled={isSubmitting}>
          <Text style={styles.secondaryButtonText}>{t('missions.form.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('missions.form.create')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
