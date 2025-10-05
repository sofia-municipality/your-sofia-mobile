import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getUniqueReporterId } from '../../../lib/deviceId';
import { createSignal, checkExistingSignal } from '../../../lib/payload';
import type { CreateSignalInput } from '../../../types/signal';

export default function NewSignalScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Prepopulated data from container
  const containerPublicNumber = params.containerPublicNumber as string | undefined;
  const containerLocation = params.containerLocation 
    ? JSON.parse(params.containerLocation as string)
    : undefined;
  const prefilledCategory = (params.prefilledCategory as string) || 'other';

  const [loading, setLoading] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  // Get device unique ID from secure storage
  useEffect(() => {
    getUniqueReporterId().then(id => {
      setDeviceId(id);
    }).catch(error => {
      console.error('Failed to get reporter ID:', error);
    });
  }, []);

  const [formData, setFormData] = useState<Partial<CreateSignalInput>>({
    title: '',
    description: '',
    category: prefilledCategory as any,
    containerState: undefined,
    cityObject: containerPublicNumber ? {
      type: 'waste-container',
      referenceId: containerPublicNumber,
      name: containerPublicNumber,
    } : undefined,
    location: containerLocation,
  });

  const toggleState = (state: string) => {
    setSelectedStates(prev => 
      prev.includes(state) 
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  // Auto-generate title from container number and selected states
  useEffect(() => {
    if (containerPublicNumber && selectedStates.length > 0) {
      const statesText = selectedStates
        .map(state => t(`signals.containerStates.${state}`))
        .join(', ');
      const autoTitle = `${containerPublicNumber} - ${statesText}`;
      setFormData(prev => ({ ...prev, title: autoTitle }));
    } else if (containerPublicNumber) {
      setFormData(prev => ({ ...prev, title: containerPublicNumber }));
    }
  }, [containerPublicNumber, selectedStates, t]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.title) {
      Alert.alert(t('common.error'), 'Моля, попълнете заглавие');
      return;
    }

    if (formData.category === 'waste-container' && selectedStates.length === 0) {
      Alert.alert(t('common.error'), 'Моля, изберете състояние на контейнера');
      return;
    }

    try {
      setLoading(true);
      
      // Check for existing signal if this is a waste container signal
      if (formData.category === 'waste-container' && containerPublicNumber && deviceId) {
        const { exists, signal: existingSignal } = await checkExistingSignal(
          deviceId,
          containerPublicNumber,
          i18n.language as 'bg' | 'en'
        );

        if (exists && existingSignal) {
          Alert.alert(
            t('signals.duplicateTitle'),
            t('signals.duplicateMessage', { id: existingSignal.id }),
            [
              {
                text: t('signals.viewExisting'),
                onPress: () => {
                  router.push(`/(tabs)/signals/${existingSignal.id}` as any);
                },
              },
              {
                text: t('common.cancel'),
                style: 'cancel',
              },
            ]
          );
          setLoading(false);
          return;
        }
      }
      
      // Prepare submission data with selected states and device ID
      const submitData = {
        ...formData,
        containerState: selectedStates,
        reporterUniqueId: deviceId,
      };
      
      await createSignal(submitData as CreateSignalInput, i18n.language as 'bg' | 'en');
      Alert.alert(t('signals.success'), '', [
        {
          text: 'OK',
          onPress: () => router.push('/signals'),
        },
      ]);
    } catch (error) {
      console.error('Error creating signal:', error);
      
      // Check if it's a duplicate signal error from backend
      if (error instanceof Error && error.message.includes('Signal for same object already exists')) {
        // Extract signal ID from error message
        const match = error.message.match(/Signal ID: (\d+)/);
        const signalId = match ? match[1] : null;
        
        Alert.alert(
          t('signals.duplicateTitle'),
          signalId 
            ? t('signals.duplicateMessage', { id: signalId })
            : error.message,
          [
            ...(signalId ? [{
              text: t('signals.viewExisting'),
              onPress: () => {
                router.push(`/(tabs)/signals/${signalId}` as any);
              },
            }] : []),
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert(t('signals.error'), error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.label}>
          <Text style={styles.label}>{t('signals.form.about')}</Text>
        </View>
      {containerPublicNumber && (
        <View style={[styles.section, styles.infoBox]}>
          <Text style={styles.infoLabel}>📦 Контейнер: {containerPublicNumber}</Text>
          {containerLocation?.address && (
            <Text style={styles.infoText}>📍 {containerLocation.address}</Text>
          )}
        </View>
      )}

      {formData.category === 'waste-container' && (
        <View style={styles.section}>
          <Text style={styles.label}>{t('signals.form.containerState')} *</Text>
          <View style={styles.stateTagsContainer}>
            {['full', 'dirty', 'damaged'].map((state) => {
              const getStateColor = (state: string) => {
                switch (state) {
                  case 'full':
                    return '#DC2626'; // Red
                  case 'dirty':
                    return '#92400E'; // Brown
                  case 'damaged':
                    return '#1F2937'; // Black/Dark Gray
                  default:
                    return '#1E40AF'; // Default Blue
                }
              };

              const stateColor = getStateColor(state);
              const isActive = selectedStates.includes(state);

              return (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.stateTag,
                    isActive && { backgroundColor: stateColor, borderColor: stateColor },
                  ]}
                  onPress={() => toggleState(state)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.stateTagText,
                      isActive && styles.stateTagTextActive,
                    ]}
                  >
                    {t(`signals.containerStates.${state}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      
      {/* Auto-generated title preview */}
      {formData.title && (
        <View style={styles.section}>
          <Text style={styles.label}>{t('signals.form.title')}:</Text>
          <TextInput style={styles.input}>{formData.title}</TextInput>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>{t('signals.form.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('signals.form.descriptionPlaceholder')}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!loading}
        />
      </View>

      {/* <View style={styles.section}>
        <Text style={styles.label}>{t('signals.form.category')} *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {['waste-container', 'street-damage', 'lighting', 'green-spaces', 'parking', 'public-transport', 'other'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                formData.category === cat && styles.categoryChipActive,
              ]}
              onPress={() => setFormData({ ...formData, category: cat as any })}
              disabled={loading}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  formData.category === cat && styles.categoryChipTextActive,
                ]}
              >
                {t(`signals.categories.${cat}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View> */}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>{t('signals.form.cancel')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>{t('signals.form.submit')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  stateTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stateTag: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  stateTagActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  stateTagText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  stateTagTextActive: {
    color: '#ffffff',
  },
  titlePreview: {
    backgroundColor: '#F0F9FF',
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  titlePreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 6,
  },
  titlePreviewText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#1E40AF',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E40AF',
  },
  radioLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#1E40AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
