import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PURPLE = '#7C3AED';

/**
 * H5 原型 Demo 主页面（拼团发布流程，11 个页面）。
 * Web 端通过 iframe 全屏加载 public/h5demo.html，覆盖整个 PhoneShell 内部空间。
 */
export default function H5DemoScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      {Platform.OS === 'web' ? (
        // @ts-ignore - iframe 仅在 web 端可用
        <iframe
          src="/h5demo.html"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            backgroundColor: '#fff',
          }}
          title="追光体 · 拼团发布流程"
        />
      ) : (
        <View style={styles.tip}>
          <Ionicons name="phone-portrait-outline" size={56} color={PURPLE} />
          <Text style={styles.title}>请使用 Web 端预览</Text>
          <Text style={styles.desc}>
            当前应用以 H5 原型为主入口，{'\n'}
            在浏览器打开 http://localhost:8081 查看完整 11 个流程页面。
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.backBtnText}>返回登录</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF' },
  tip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  desc: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: PURPLE,
  },
  backBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
