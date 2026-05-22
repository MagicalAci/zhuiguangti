import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAFAFE' }, animation: 'slide_from_right' }}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding/preferences" options={{ animation: 'fade' }} />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="group/products" />
        <Stack.Screen name="group/promo" />
        <Stack.Screen name="group/success" options={{ animation: 'fade' }} />
        <Stack.Screen name="group/matrix" />
        <Stack.Screen name="group/chat" />
        <Stack.Screen name="group/finance" options={{ headerShown: true, title: '收款对账', headerTintColor: '#1E1B4B' }} />
        <Stack.Screen name="group/shipping" options={{ headerShown: true, title: '发货管理', headerTintColor: '#1E1B4B' }} />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="order/pay" />
        <Stack.Screen name="orders/in-progress" />
        <Stack.Screen name="orders/to-receive" />
        <Stack.Screen name="orders/done" />
        <Stack.Screen name="orders/review" />
        <Stack.Screen name="admin/setup" />
        <Stack.Screen name="managed/index" />
        <Stack.Screen name="leader/credentials" />
        <Stack.Screen name="member/orders-ongoing" />
        <Stack.Screen name="member/orders-to-ship" />
        <Stack.Screen name="member/orders-to-receive" />
        <Stack.Screen name="member/orders-done" />
        <Stack.Screen name="settings/addresses" />
        <Stack.Screen name="settings/messages" />
        <Stack.Screen name="blacklist" />
        <Stack.Screen name="ai-chat" />
        <Stack.Screen name="create-group" />
      </Stack>
    </>
  );
}
