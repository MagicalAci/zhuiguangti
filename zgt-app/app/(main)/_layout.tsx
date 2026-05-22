import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';
const PINK = '#F43F5E';

export default function MainTabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const bottomInset = insets.bottom || (isWeb ? 12 : 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: '#B8B8D0',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 0,
          position: isWeb ? ('fixed' as any) : 'absolute',
          left: 0, right: 0, bottom: 0,
          height: 58 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          shadowColor: '#1E1B4B',
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -6 },
          elevation: 10,
          zIndex: 100,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '谷团',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'globe' : 'globe-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={[st.pubBtn, focused && st.pubBtnActive]}>
              <Ionicons name="add" size={28} color="#FFF" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[st.iconWrap, focused && st.iconActive]}>
      <Ionicons name={name as any} size={21} color={focused ? '#7C3AED' : '#B8B8D0'} />
    </View>
  );
}

const st = StyleSheet.create({
  iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: '#7C3AED12' },
  pubBtn: {
    width: 52, height: 52, borderRadius: 17,
    backgroundColor: '#F43F5E',
    alignItems: 'center', justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#F43F5E', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  pubBtnActive: { backgroundColor: '#E11D48' },
});
