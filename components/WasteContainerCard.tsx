import React from 'react'
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native'
import {useTranslation} from 'react-i18next'
import {useRouter} from 'expo-router'
import type {WasteContainer} from '../types/wasteContainer'
import {Trash2, MapPin, Calendar, User, AlertTriangle} from 'lucide-react-native'

interface WasteContainerCardProps {
  container: WasteContainer
  onClose?: () => void
}

export function WasteContainerCard({container, onClose}: WasteContainerCardProps) {
  const {t} = useTranslation()
  const router = useRouter()

  const handleReportIssue = () => {
    // Close the card first
    if (onClose) {
      onClose()
    }

    // Navigate to signal creation form with prepopulated container data
    router.push({
      pathname: '/(tabs)/signals/new',
      params: {
        containerPublicNumber: container.publicNumber,
        containerLocation: JSON.stringify(container.location),
        prefilledCategory: 'waste-container',
      },
    } as any)
  }

  const getCapacitySizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      tiny: t('wasteContainers.size.tiny') || 'Tiny',
      small: t('wasteContainers.size.small') || 'Small',
      standard: t('wasteContainers.size.standard') || 'Standard',
      big: t('wasteContainers.size.big') || 'Big',
      industrial: t('wasteContainers.size.industrial') || 'Industrial',
    }
    return labels[size] || size
  }

  const getWasteTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: t('wasteContainers.type.general') || 'General Waste',
      recyclables: t('wasteContainers.type.recyclables') || 'Recyclables',
      organic: t('wasteContainers.type.organic') || 'Organic',
      glass: t('wasteContainers.type.glass') || 'Glass',
      paper: t('wasteContainers.type.paper') || 'Paper',
      plastic: t('wasteContainers.type.plastic') || 'Plastic',
      metal: t('wasteContainers.type.metal') || 'Metal',
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#10B981',
      full: '#EF4444',
      maintenance: '#F59E0B',
      inactive: '#6B7280',
    }
    return colors[status] || '#6B7280'
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text style={styles.containerNumber}>
            {t('wasteContainers.name')}: {container.publicNumber}
          </Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, {backgroundColor: getStatusColor(container.status)}]} />
            <Text style={styles.statusText}>{container.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleReportIssue} style={styles.reportButton}>
            <AlertTriangle size={16} color="#ffffff" />
            <Text style={styles.reportButtonText}>{t('wasteContainers.reportIssue')}</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {container.image?.url && (
        <Image source={{uri: container.image.url}} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Trash2 size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            {getWasteTypeLabel(container.wasteType)} •{' '}
            {getCapacitySizeLabel(container.capacitySize)} ({container.capacityVolume}m³)
          </Text>
        </View>

        {container.location.address && (
          <View style={styles.infoRow}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.infoText}>{container.location.address}</Text>
          </View>
        )}

        {container.serviceInterval && (
          <View style={styles.infoRow}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.infoText}>{container.serviceInterval}</Text>
          </View>
        )}

        {container.servicedBy && (
          <View style={styles.infoRow}>
            <User size={16} color="#6B7280" />
            <Text style={styles.infoText}>{container.servicedBy}</Text>
          </View>
        )}

        {container.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>{t('wasteContainers.notes') || 'Notes'}:</Text>
            <Text style={styles.notesText}>{container.notes}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  containerNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
    lineHeight: 24,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
})
