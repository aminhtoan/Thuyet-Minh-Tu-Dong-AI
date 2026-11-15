import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { env } from '../../config/env';
import { trackListen } from '../../services/analyticsService';
import { fetchPublicGuides, publicAudioOptionKey, publicAudioOptionLabel, publicAudioUrl, type PublicAudioGuide, type PublicAudioOption } from './publicAudio.mjs';
import { ms, museum } from './theme';

const unavailable = 'Không thể tải âm thanh công khai. Bản thu có thể không còn khả dụng hoặc kết nối đang gián đoạn.';

export function PublicAudioPlayer({ option }: { option: PublicAudioOption }) {
  const uri = publicAudioUrl(option, env.apiBaseUrl);
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);
  const alive = useRef(false), tracked = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; try { player.pause(); } catch { /* hook disposes the native player on unmount */ } };
  }, [player]);
  useEffect(() => {
    if (!uri || status.isLoaded || status.error) return;
    const timer = setTimeout(() => { if (alive.current) setError(true); }, 15000);
    return () => clearTimeout(timer);
  }, [uri, status.isLoaded, status.error]);
  const failed = !uri || error || Boolean(status.error);
  const loading = !failed && !status.isLoaded;
  async function toggle() {
    if (failed || loading) return;
    try {
      if (status.playing) { player.pause(); return; }
      if (status.didJustFinish) await player.seekTo(0);
      if (!alive.current) return;
      player.play();
      if (!tracked.current && option.type !== 'ORIGINAL_AUDIO') {
        tracked.current = true;
        void trackListen({ platform: 'mobile', projectId: option.projectId, narrationId: option.narrationId, languageCode: option.code });
      }
    } catch { if (alive.current) setError(true); }
  }
  return <View style={ms.section}>
    <Text accessibilityLiveRegion="polite" style={ms.body}>{failed ? unavailable : loading ? 'Đang tải âm thanh…' : status.playing ? 'Đang phát âm thanh' : 'Sẵn sàng phát'}</Text>
    {failed && <Text accessibilityRole="alert" style={ms.body}>Đóng cửa sổ hoặc chọn lại bản thu để tải lại.</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Tạm dừng' : 'Phát âm thanh'}
      accessibilityState={{ disabled: failed || loading }} disabled={failed || loading} onPress={() => void toggle()}
      style={({ pressed }) => [ms.link, ms.primary, pressed && ms.primaryPressed, (failed || loading) && styles.disabled]}>
      <MaterialCommunityIcons accessible={false} name={status.playing ? 'pause' : 'play'} size={24} color={museum.white} />
      <Text style={[ms.linkText, ms.whiteText]}>{status.playing ? 'Tạm dừng' : 'Phát âm thanh'}</Text>
    </Pressable>
  </View>;
}

export function PublicAudioSection() {
  const [guides, setGuides] = useState<PublicAudioGuide[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const [guide, setGuide] = useState<PublicAudioGuide | null>(null);
  const [optionId, setOptionId] = useState('');
  const [focused, setFocused] = useState(false);
  const revision = useRef(0), pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true); setError(false); setGuide(null);
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const value = await fetchPublicGuides(env.apiBaseUrl, controller.signal);
      if (current === revision.current && !controller.signal.aborted) setGuides(value);
      else if (current === revision.current) setError(true);
    } catch { if (current === revision.current) { setGuides([]); setError(true); } }
    finally { clearTimeout(timer); if (current === revision.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    setFocused(true); void reload();
    return () => { revision.current++; pending.current?.abort(); setFocused(false); setGuide(null); };
  }, [reload]));
  const selected = guide?.languages.find(option => publicAudioOptionKey(option) === optionId);
  return <View style={ms.section}>
    <Text accessibilityRole="header" style={ms.heading}>Âm thanh thuyết minh đa ngôn ngữ</Text>
    <Text style={ms.body}>Chọn âm thanh gốc hoặc bản thuyết minh AI đã được cho phép công khai để lắng nghe.</Text>
    {loading ? <Text accessibilityLiveRegion="polite" style={ms.body}>Đang tải danh sách âm thanh…</Text> : error ? <View style={ms.card}>
      <Text accessibilityRole="alert" style={ms.body}>Không tải được danh sách âm thanh công khai.</Text>
      <Pressable accessibilityRole="button" onPress={() => void reload()} style={ms.link}><Text style={ms.linkText}>Thử lại</Text></Pressable>
    </View> : guides.length ? guides.map(item => <View key={item.key} style={ms.card}>
      <Text accessibilityRole="header" style={ms.heading}>{item.title}</Text>
      {item.description ? <Text style={ms.body}>{item.description}</Text> : null}
      <Text style={ms.small}>{item.languages.length} bản âm thanh</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Mở âm thanh ${item.title}`} disabled={!item.languages.length}
        onPress={() => { setOptionId(publicAudioOptionKey(item.languages[0]!)); setGuide(item); }} style={ms.link}>
        <Text style={ms.linkText}>Chọn bản âm thanh</Text>
      </Pressable>
    </View>) : <Text style={ms.body}>Chưa có bản âm thanh được cho phép công khai.</Text>}
    {focused && guide && <Modal visible transparent animationType="fade" onRequestClose={() => setGuide(null)}>
      <SafeAreaView style={styles.backdrop}><View style={styles.dialog} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={ms.heading}>{guide.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng cửa sổ nghe" onPress={() => setGuide(null)} style={ms.link}><Text style={ms.linkText}>Đóng</Text></Pressable>
          <Text style={ms.body}>Chọn phiên bản âm thanh:</Text>
          <View style={ms.section}>{guide.languages.map(option => <Pressable key={publicAudioOptionKey(option)} accessibilityRole="button"
            accessibilityLabel={publicAudioOptionLabel(option)} accessibilityState={{ selected: publicAudioOptionKey(option) === optionId }}
            onPress={() => setOptionId(publicAudioOptionKey(option))} style={[ms.link, publicAudioOptionKey(option) === optionId && ms.selected]}>
            <Text style={ms.linkText}>{publicAudioOptionLabel(option)}</Text>
          </Pressable>)}</View>
          {selected && <PublicAudioPlayer key={`${publicAudioOptionKey(selected)}:${selected.audioUrl}`} option={selected} />}
        </ScrollView>
      </View></SafeAreaView>
    </Modal>}
  </View>;
}
const styles = StyleSheet.create({
  disabled: { opacity: 0.5 }, backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.75)', justifyContent: 'center', padding: 16 },
  dialog: { maxHeight: '90%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: museum.white, borderRadius: 18 },
  content: { padding: 20, gap: 16 },
});
