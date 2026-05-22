import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrefs } from '../src/store/usePrefs';

const { width: W, height: H } = Dimensions.get('window');
const PURPLE = '#7C3AED';

export default function LoginScreen() {
  const router = useRouter();
  const prefsDone = usePrefs((s) => s.prefsDone);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendCode = () => {
    if (phone.length < 11) return;
    setCodeSent(true);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const goAfterLogin = () => {
    if (!prefsDone) router.replace('/onboarding/preferences' as any);
    else            router.replace('/(main)/');
  };

  const handleLogin = () => {
    goAfterLogin();
  };

  const handleWechatLogin = () => {
    goAfterLogin();
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 背景装饰 */}
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />

      <View style={s.content}>
        {/* Logo区 */}
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>追</Text>
          </View>
          <Text style={s.appName}>追光体</Text>
          <Text style={s.appSlogan}>兴趣圈层的谷子社区</Text>
        </View>

        {/* 登录表单 */}
        <View style={s.formCard}>
          {/* 手机号输入 */}
          <View style={s.inputRow}>
            <View style={s.inputIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color="#9CA3AF" />
            </View>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 11))}
              placeholder="输入手机号"
              placeholderTextColor="#C4C4D4"
              keyboardType="phone-pad"
              maxLength={11}
            />
            {phone.length === 11 && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
          </View>

          {/* 验证码输入 */}
          <View style={s.inputRow}>
            <View style={s.inputIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
            </View>
            <TextInput
              style={s.input}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="输入验证码"
              placeholderTextColor="#C4C4D4"
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[s.codeBtn, (phone.length < 11 || countdown > 0) && s.codeBtnDisabled]}
              onPress={sendCode}
              disabled={phone.length < 11 || countdown > 0}
              activeOpacity={0.7}
            >
              <Text style={[s.codeBtnText, (phone.length < 11 || countdown > 0) && s.codeBtnTextDisabled]}>
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 登录按钮 */}
          <TouchableOpacity
            style={[s.loginBtn, (!phone || !code) && { opacity: 0.5 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={!phone || !code}
          >
            <Text style={s.loginBtnText}>登录 / 注册</Text>
          </TouchableOpacity>

          {/* 分割线 */}
          <View style={s.dividerRow}>
            <View style={s.divider} />
            <Text style={s.dividerText}>或</Text>
            <View style={s.divider} />
          </View>

          {/* 微信登录 */}
          <TouchableOpacity style={s.wechatBtn} onPress={handleWechatLogin} activeOpacity={0.85}>
            <Ionicons name="logo-wechat" size={22} color="#FFF" />
            <Text style={s.wechatBtnText}>微信一键登录</Text>
          </TouchableOpacity>
        </View>

        {/* 底部协议 */}
        <Text style={s.terms}>
          登录即表示同意{' '}
          <Text style={s.termsLink}>用户协议</Text>
          {' '}和{' '}
          <Text style={s.termsLink}>隐私政策</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFE' },
  bgCircle1: { position: 'absolute', top: -H * 0.12, right: -W * 0.2, width: W * 0.7, height: W * 0.7, borderRadius: W * 0.35, backgroundColor: '#7C3AED10' },
  bgCircle2: { position: 'absolute', bottom: -H * 0.08, left: -W * 0.15, width: W * 0.5, height: W * 0.5, borderRadius: W * 0.25, backgroundColor: '#F43F5E08' },

  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 72, height: 72, borderRadius: 22, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6, marginBottom: 16 },
  logoText: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  appName: { fontSize: 28, fontWeight: '800', color: '#1E1B4B', letterSpacing: 1 },
  appSlogan: { fontSize: 14, color: '#9CA3AF', marginTop: 6 },

  formCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#1E1B4B', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },

  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8FC', borderRadius: 14, paddingHorizontal: 14, height: 52, marginBottom: 14, gap: 10 },
  inputIcon: { width: 28 },
  input: { flex: 1, fontSize: 16, color: '#1E1B4B' },

  codeBtn: { backgroundColor: PURPLE + '15', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  codeBtnDisabled: { backgroundColor: '#F0F0F5' },
  codeBtnText: { fontSize: 13, fontWeight: '600', color: PURPLE },
  codeBtnTextDisabled: { color: '#C4C4D4' },

  loginBtn: { backgroundColor: PURPLE, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  loginBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: '#F0F0F5' },
  dividerText: { fontSize: 12, color: '#C4C4D4' },

  wechatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#07C160', borderRadius: 14, height: 52 },
  wechatBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  terms: { textAlign: 'center', fontSize: 11, color: '#C4C4D4', marginTop: 24, lineHeight: 18 },
  termsLink: { color: PURPLE },
});
