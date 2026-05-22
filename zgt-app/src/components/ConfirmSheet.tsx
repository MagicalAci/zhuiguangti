import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, FontSize } from '../theme';

interface Props {
  visible: boolean;
  icon?: string;
  iconColor?: string;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ visible, icon, iconColor, title, message, confirmLabel = '确认', cancelLabel = '取消', destructive, onConfirm, onCancel }: Props) {
  const mainColor = destructive ? Colors.danger : Colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.overlay} onPress={onCancel}>
        <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>
          {icon && (
            <View style={[s.iconWrap, { backgroundColor: `${iconColor ?? mainColor}12` }]}>
              <Ionicons name={icon as any} size={32} color={iconColor ?? mainColor} />
            </View>
          )}
          <Text style={s.title}>{title}</Text>
          {message && <Text style={s.message}>{message}</Text>}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { onConfirm(); onCancel(); }} activeOpacity={0.8}>
              <LinearGradient colors={destructive ? [Colors.danger, '#B91C1C'] : Colors.gradient.primary} style={s.confirmBtn}>
                <Text style={s.confirmText}>{confirmLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: { backgroundColor: '#FFF', borderRadius: Radius.xxl, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  message: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: { borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  confirmText: { fontSize: FontSize.md, fontWeight: '700', color: '#FFF' },
});
