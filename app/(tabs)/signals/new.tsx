import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSignal } from '../../../lib/payload';
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
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.description) {
      Alert.alert(t('common.error'), 'Моля, попълнете заглавие и описание');
      return;
    }

    if (formData.category === 'waste-container' && !formData.containerState) {
      Alert.alert(t('common.error'), 'Моля, изберете състояние на контейнера');
      return;
    }

    try {
      setLoading(true);
      await createSignal(formData as CreateSignalInput, i18n.language as 'bg' | 'en');
      Alert.alert(t('signals.success'), '', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating signal:', error);
      Alert.alert(t('signals.error'), error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>{t('signals.form.title')} *</Text>
        <TextInput
          style={styles.input}
          placeholder={t('signals.form.titlePlaceholder')}
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          editable={!loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('signals.form.description')} *</Text>
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

      <View style={styles.section}>
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
      </View>

      {formData.category === 'waste-container' && (
        <View style={styles.section}>
          <Text style={styles.label}>{t('signals.form.containerState')} *</Text>
          <View style={styles.radioGroup}>
            {['full', 'dirty', 'damaged'].map((state) => (
              <TouchableOpacity
                key={state}
                style={styles.radioOption}
                onPress={() => setFormData({ ...formData, containerState: state as any })}
                disabled={loading}
              >
                <View style={styles.radio}>
                  {formData.containerState === state && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>{t(`signals.containerStates.${state}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {containerPublicNumber && (
        <View style={[styles.section, styles.infoBox]}>
          <Text style={styles.infoLabel}>📦 Контейнер:</Text>
          <Text style={styles.infoText}>{containerPublicNumber}</Text>
          {containerLocation?.address && (
            <Text style={styles.infoText}>📍 {containerLocation.address}</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>{t('signals.form.reporterName')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('signals.form.reporterName')}
          value={formData.reporterName}
          onChangeText={(text) => setFormData({ ...formData, reporterName: text })}
          editable={!loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('signals.form.reporterEmail')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('signals.form.reporterEmail')}
          value={formData.reporterEmail}
          onChangeText={(text) => setFormData({ ...formData, reporterEmail: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('signals.form.reporterPhone')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('signals.form.reporterPhone')}
          value={formData.reporterPhone}
          onChangeText={(text) => setFormData({ ...formData, reporterPhone: text })}
          keyboardType="phone-pad"
          editable={!loading}
        />
      </View>

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
