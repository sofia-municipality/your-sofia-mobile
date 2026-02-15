import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native'
import {
  CreditCard,
  Zap,
  Home,
  Car,
  Droplets,
  Wifi,
  Receipt,
  ChevronRight,
  Search,
  Clock,
} from 'lucide-react-native'
import {useTranslation} from 'react-i18next'
import {commonStyles, uiTokens} from '../../styles/common'

interface Bill {
  id: number
  title: string
  icon: any
  color: string
  amount: string
  dueDate: string
  status: 'pending' | 'overdue'
}

interface Payment {
  id: number
  title: string
  amount: string
  date: string
  status: string
}

const getBillCategories = (t: (key: string) => string): Bill[] => [
  {
    id: 1,
    title: t('payments.bills.electricity'),
    icon: Zap,
    color: '#F59E0B',
    amount: '124.50',
    dueDate: `${t('payments.common.due')} Jan 15`,
    status: 'pending',
  },
  {
    id: 2,
    title: t('payments.bills.waterSewer'),
    icon: Droplets,
    color: '#3B82F6',
    amount: '89.20',
    dueDate: `${t('payments.common.due')} Jan 20`,
    status: 'pending',
  },
  {
    id: 3,
    title: t('payments.bills.propertyTax'),
    icon: Home,
    color: '#059669',
    amount: '450.00',
    dueDate: `${t('payments.common.due')} Feb 1`,
    status: 'pending',
  },
  {
    id: 4,
    title: t('payments.bills.parkingFines'),
    icon: Car,
    color: '#DC2626',
    amount: '25.00',
    dueDate: t('payments.status.overdue'),
    status: 'overdue',
  },
]

const getRecentPayments = (t: (key: string) => string): Payment[] => [
  {
    id: 1,
    title: t('payments.bills.electricity'),
    amount: '98.30',
    date: 'Dec 15, 2024',
    status: t('payments.status.paid'),
  },
  {
    id: 2,
    title: t('payments.bills.waterSewer'),
    amount: '76.45',
    date: 'Dec 10, 2024',
    status: t('payments.status.paid'),
  },
  {
    id: 3,
    title: t('payments.bills.waterSewer'),
    amount: '35.00',
    date: 'Dec 5, 2024',
    status: t('payments.status.paid'),
  },
]

export default function PaymentsScreen() {
  const {t} = useTranslation()
  const billCategories = getBillCategories(t)
  const recentPayments = getRecentPayments(t)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('payments.common.searchPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Outstanding Bills */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('payments.common.upcomingPayments')}</Text>
            <Text style={styles.totalAmount}>
              {t('payments.common.totalAmount', {amount: '688.70'})}
            </Text>
          </View>

          <View style={styles.billsList}>
            {billCategories.map((bill: Bill) => {
              const IconComponent = bill.icon
              return (
                <TouchableOpacity
                  key={bill.id}
                  style={[styles.billCard, bill.status === 'overdue' && styles.overdueBill]}
                >
                  <View style={styles.billContent}>
                    <View style={[styles.billIcon, {backgroundColor: bill.color}]}>
                      <IconComponent size={24} color="#ffffff" />
                    </View>
                    <View style={styles.billInfo}>
                      <Text style={styles.billTitle}>{bill.title}</Text>
                      <Text
                        style={[
                          styles.billDueDate,
                          bill.status === 'overdue' && styles.overdueDueDate,
                        ]}
                      >
                        {bill.dueDate}
                      </Text>
                    </View>
                    <View style={styles.billAmountContainer}>
                      <Text style={styles.billAmount}>{bill.amount} лв</Text>
                      <ChevronRight size={20} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity style={styles.payAllButton}>
            <CreditCard size={20} color="#ffffff" />
            <Text style={styles.payAllButtonText}>{t('payments.common.payAllBills')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Payment Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payments.common.quickPayments')}</Text>
          <View style={styles.quickPaymentGrid}>
            <TouchableOpacity style={styles.quickPaymentCard}>
              <Wifi size={24} color="#1E40AF" />
              <Text style={styles.quickPaymentText}>{t('payments.common.internet')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickPaymentCard}>
              <Receipt size={24} color="#1E40AF" />
              <Text style={styles.quickPaymentText}>{t('payments.common.otherPayment')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Payments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('payments.common.recentPayments')}</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>{t('payments.common.viewAll')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentPaymentsList}>
            {recentPayments.map((payment: Payment) => (
              <View key={payment.id} style={styles.paymentHistoryCard}>
                <View style={styles.paymentHistoryIcon}>
                  <Receipt size={20} color="#059669" />
                </View>
                <View style={styles.paymentHistoryInfo}>
                  <Text style={styles.paymentHistoryTitle}>{payment.title}</Text>
                  <View style={styles.paymentHistoryMeta}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.paymentHistoryDate}>{payment.date}</Text>
                  </View>
                </View>
                <View style={styles.paymentHistoryAmount}>
                  <Text style={styles.paymentHistoryAmountText}>-{payment.amount} лв</Text>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>{payment.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('payments.common.paymentMethods')}</Text>
          <View style={styles.paymentMethodCard}>
            <CreditCard size={24} color="#1E40AF" />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>{t('payments.common.debitCreditCard')}</Text>
              <Text style={styles.paymentMethodDescription}>
                {t('payments.common.cardsAccepted')}
              </Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: uiTokens.spacing.xl,
    paddingTop: uiTokens.spacing.xl,
  },
  searchBar: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: uiTokens.colors.textPrimary,
  },
  section: {
    paddingHorizontal: uiTokens.spacing.xl,
    marginTop: uiTokens.spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.danger,
  },
  viewAllText: {
    fontSize: 14,
    color: uiTokens.colors.primary,
    fontWeight: '500',
  },
  billsList: {
    gap: 12,
  },
  billCard: {
    ...commonStyles.card,
    padding: 16,
  },
  overdueBill: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  billContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    marginBottom: 4,
  },
  billDueDate: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  overdueDueDate: {
    color: '#DC2626',
    fontWeight: '500',
  },
  billAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
  },
  payAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  payAllButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickPaymentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickPaymentCard: {
    ...commonStyles.card,
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  quickPaymentText: {
    fontSize: 14,
    color: uiTokens.colors.textPrimary,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  recentPaymentsList: {
    gap: 12,
  },
  paymentHistoryCard: {
    ...commonStyles.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentHistoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentHistoryInfo: {
    flex: 1,
  },
  paymentHistoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: uiTokens.colors.textPrimary,
    marginBottom: 4,
  },
  paymentHistoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentHistoryDate: {
    fontSize: 12,
    color: uiTokens.colors.textMuted,
  },
  paymentHistoryAmount: {
    alignItems: 'flex-end',
  },
  paymentHistoryAmountText: {
    fontSize: 16,
    fontWeight: '500',
    color: uiTokens.colors.textPrimary,
    marginBottom: 4,
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  paidBadgeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '500',
  },
  paymentMethodCard: {
    ...commonStyles.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: uiTokens.colors.textPrimary,
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
})
