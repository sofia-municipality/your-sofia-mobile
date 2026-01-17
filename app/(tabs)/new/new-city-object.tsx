import React, {useState} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import {MapPin, Trash2} from 'lucide-react-native'
import type {WasteType, CapacitySize} from '../../../types/wasteContainer'

export default function NewCityObjectScreen() {
  const {t} = useTranslation()
  const router = useRouter()

  const [objectType, setObjectType] = useState<'waste-container' | null>('waste-container')
  const [publicNumber, setPublicNumber] = useState('')
  const [wasteType, setWasteType] = useState<WasteType>('general')
  const [capacitySize, setCapacitySize] = useState<CapacitySize>('standard')
  const [capacityVolume, setCapacityVolume] = useState('')
  const [binCount, setBinCount] = useState('1')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const wasteTypes: WasteType[] = [
    'general',
    'recyclables',
    'organic',
    'glass',
    'paper',
    'plastic',
    'metal',
  ]

  const capacitySizes: CapacitySize[] = ['tiny', 'small', 'standard', 'big', 'industrial']

  const handleSubmit = async () => {
    if (!publicNumber.trim()) {
      Alert.alert(t('common.error'), t('newCityObject.publicNumberRequired'))
      return
    }

    if (!latitude || !longitude) {
      Alert.alert(t('common.error'), t('newCityObject.locationRequired'))
      return
    }

    if (!capacityVolume) {
      Alert.alert(t('common.error'), t('newCityObject.capacityRequired'))
      return
    }

    setLoading(true)
    try {
      // TODO: Implement API call to create waste container
      const containerData = {
        publicNumber: publicNumber.trim(),
        wasteType,
        capacitySize,
        capacityVolume: parseFloat(capacityVolume),
        binCount: parseInt(binCount) || 1,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: address.trim() || undefined,
        },
        notes: notes.trim() || undefined,
        status: 'active' as const,
      }

      console.log('[NewCityObject] Creating container:', containerData)

      Alert.alert(t('common.success'), t('newCityObject.createSuccess'), [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ])
    } catch (error) {
      console.error('Error creating city object:', error)
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('newCityObject.createError')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Trash2 size={32} color="#1E40AF" />
          <Text style={styles.headerTitle}>{t('newCityObject.title')}</Text>
        </View>

        {/* Public Number */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.publicNumber')}</Text>
          <TextInput
            style={styles.input}
            value={publicNumber}
            onChangeText={setPublicNumber}
            placeholder={t('newCityObject.publicNumberPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Waste Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.wasteType')}</Text>
          <View style={styles.chipContainer}>
            {wasteTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, wasteType === type && styles.chipSelected]}
                onPress={() => setWasteType(type)}
              >
                <Text style={[styles.chipText, wasteType === type && styles.chipTextSelected]}>
                  {t(`wasteContainers.type.${type}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Capacity Size */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.capacitySize')}</Text>
          <View style={styles.chipContainer}>
            {capacitySizes.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.chip, capacitySize === size && styles.chipSelected]}
                onPress={() => setCapacitySize(size)}
              >
                <Text style={[styles.chipText, capacitySize === size && styles.chipTextSelected]}>
                  {t(`wasteContainers.size.${size}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Capacity Volume */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.capacityVolume')}</Text>
          <TextInput
            style={styles.input}
            value={capacityVolume}
            onChangeText={setCapacityVolume}
            placeholder="1.0"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Bin Count */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.binCount')}</Text>
          <TextInput
            style={styles.input}
            value={binCount}
            onChangeText={setBinCount}
            placeholder="1"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.location')}</Text>
          <View style={styles.locationIcon}>
            <MapPin size={20} color="#1E40AF" />
          </View>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={setLatitude}
            placeholder={t('newCityObject.latitude')}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, {marginTop: 8}]}
            value={longitude}
            onChangeText={setLongitude}
            placeholder={t('newCityObject.longitude')}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.address')}</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder={t('newCityObject.addressPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('newCityObject.notes')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('newCityObject.notesPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? t('common.creating') : t('common.create')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 120,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E40AF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#1E40AF',
  },
  locationIcon: {
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  bottomSpacer: {
    height: 20,
  },
})
