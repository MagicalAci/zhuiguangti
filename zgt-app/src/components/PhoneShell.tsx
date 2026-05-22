import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';

/**
 * 仅在 Web + 桌面分辨率下，给应用包一层"手机外壳"，让 RN 应用在
 * 浏览器里看起来就是一台 iPhone。移动端 (width < 768) 与原生平台
 * (iOS / Android) 自动全屏，不做任何包装。
 */
export default function PhoneShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  // 在 web 端注入一次全局背景渐变 + 字体平滑
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'zgt-phone-shell-global';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      html, body, #root { height: 100%; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
        background: linear-gradient(135deg, #f5f3ff 0%, #fef3f8 50%, #fff7ed 100%);
        -webkit-font-smoothing: antialiased;
        overflow: hidden;
      }
      @media (max-width: 767px) {
        body { background: #fff; overflow: auto; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 非 Web 平台直接铺满
  if (Platform.OS !== 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  // 移动端宽度（< 768）走全屏
  const isMobile = width < 768;
  if (isMobile) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }}>{children}</View>;
  }

  // 桌面端：手机外壳
  return (
    <View style={styles.stage}>
      <View style={styles.phone}>
        <View style={styles.notch} />
        <View style={styles.phoneInner}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  } as any,
  phone: {
    width: 390,
    height: 820,
    maxHeight: '95vh' as unknown as number,
    backgroundColor: '#fff',
    borderRadius: 48,
    borderWidth: 10,
    borderColor: '#1a1a2e',
    overflow: 'hidden',
    position: 'relative',
    // Web only shadow
    ...(Platform.OS === 'web'
      ? ({
          boxShadow:
            '0 30px 60px -20px rgba(124,92,252,0.35), 0 18px 36px -18px rgba(255,107,157,0.25)',
        } as any)
      : {}),
  },
  notch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 130,
    height: 26,
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    zIndex: 1000,
    transform: [{ translateX: -65 }],
  },
  phoneInner: {
    flex: 1,
    overflow: 'hidden',
  },
});
