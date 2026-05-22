import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../theme';

interface Action {
  icon: string;
  label: string;
  color?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: Action[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          {title && <Text style={styles.title}>{title}</Text>}
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={styles.action}
              activeOpacity={0.7}
              onPress={() => { a.onPress(); onClose(); }}
            >
              <View style={[styles.iconBg, { backgroundColor: `${a.destructive ? Colors.danger : (a.color ?? Colors.primary)}12` }]}>
                <Ionicons name={a.icon as any} size={22} color={a.destructive ? Colors.danger : (a.color ?? Colors.primary)} />
              </View>
              <Text style={[styles.label, a.destructive && { color: Colors.danger }]}>{a.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, paddingTop: Spacing.md, paddingBottom: 40, paddingHorizontal: Spacing.lg },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg, textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: FontSize.lg, fontWeight: '500', color: Colors.text },
  cancel: { marginTop: Spacing.lg, backgroundColor: Colors.bgMuted, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  cancelText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary },
});
