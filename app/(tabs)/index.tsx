import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card } from '@/src/components/ui';

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.greeting, { color: Colors[colorScheme].text }]}>Dashboard</Text>

      <Card style={styles.netWorthCard}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={[styles.netWorthValue, { color: Colors[colorScheme].tint }]}>$0.00</Text>
        <Text style={[styles.netWorthSubtext, { color: Colors[colorScheme].text, opacity: 0.5 }]}>
          Add accounts to track your net worth
        </Text>
      </Card>

      <View style={styles.row}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: Colors[colorScheme].text, opacity: 0.6 }]}>
            Monthly Expenses
          </Text>
          <Text style={[styles.summaryValue, { color: '#ff3b30' }]}>$0.00</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: Colors[colorScheme].text, opacity: 0.6 }]}>
            Monthly Income
          </Text>
          <Text style={[styles.summaryValue, { color: '#34c759' }]}>$0.00</Text>
        </Card>
      </View>

      <View style={styles.row}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: Colors[colorScheme].text, opacity: 0.6 }]}>
            Investments
          </Text>
          <Text style={[styles.summaryValue, { color: Colors[colorScheme].tint }]}>$0.00</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: Colors[colorScheme].text, opacity: 0.6 }]}>
            Savings
          </Text>
          <Text style={[styles.summaryValue, { color: Colors[colorScheme].tint }]}>$0.00</Text>
        </Card>
      </View>

      <Card style={styles.subscriptionCard}>
        <Text style={[styles.summaryLabel, { color: Colors[colorScheme].text, opacity: 0.6 }]}>
          Monthly Subscriptions
        </Text>
        <Text style={[styles.summaryValue, { color: '#ff9500' }]}>$0.00</Text>
      </Card>

      <Text style={[styles.sectionHint, { color: Colors[colorScheme].text, opacity: 0.4 }]}>
        Full dashboard with charts coming soon. Start by adding expenses and income!
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  netWorthCard: { marginBottom: 16, alignItems: 'center', paddingVertical: 24 },
  netWorthLabel: { fontSize: 14, color: '#888', marginBottom: 4 },
  netWorthValue: { fontSize: 36, fontWeight: 'bold' },
  netWorthSubtext: { fontSize: 13, marginTop: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16 },
  summaryLabel: { fontSize: 13, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  subscriptionCard: { marginBottom: 12, padding: 16 },
  sectionHint: { fontSize: 13, textAlign: 'center', marginTop: 16 },
});
