import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { trackListen } from '@/services/analyticsService';
import type { ResultSource } from './useResult';

export function ResultPlayer({ source, video }: { source: ResultSource; video: boolean }) {
  return video ? <ResultVideo source={source} /> : <ResultAudio source={source} />;
}
export function ResultVideo({ source }: { source: ResultSource }) {
  // Hook releases native player on unmount. No autoplay or persistent cache.
  const player = useVideoPlayer(source);
  const [status, setStatus] = useState(player.status);
  useEffect(() => { const subscription = player.addListener('statusChange', event => setStatus(event.status)); return () => subscription.remove(); }, [player]);
  return <View style={styles.media}>
    <VideoView accessibilityLabel="Phát video kết quả được bảo vệ" player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} style={styles.video} />
    {(status === 'loading' || status === 'idle') && <Spinner label="Đang tải video kết quả" />}
    {status === 'error' && <Text accessibilityRole="alert" style={styles.error}>Không thể phát video. Vui lòng kiểm tra kết nối hoặc tải lại kết quả.</Text>}
  </View>;
}
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
// Expo native SharedObject exposes volume through its documented writable setter.
function setNativeVolume(player: { volume: number }, value: number) { player.volume = value; }
export function ResultAudio({ source }: { source: ResultSource }) {
  const player = useAudioPlayer(source, { downloadFirst: false });
  const status = useAudioPlayerStatus(player);
  const [controlError, setControlError] = useState(false), [width, setWidth] = useState(1), [volume, setVolume] = useState(1);
  const seek = async (seconds: number) => { try { await player.seekTo(Math.max(0, Math.min(status.duration, seconds))); } catch { setControlError(true); } };
  const changeVolume = (value: number) => { try { setNativeVolume(player, value); setVolume(value); } catch { setControlError(true); } };
  return <View style={styles.media}>
    {(!status.isLoaded || status.isBuffering) && !status.error && <Spinner label="Đang tải âm thanh kết quả" />}
    {(status.error || controlError) && <Text accessibilityRole="alert" style={styles.error}>Không thể phát âm thanh. Vui lòng kiểm tra kết nối hoặc tải lại kết quả.</Text>}
    <Button disabled={!status.isLoaded || Boolean(status.error)} onPress={async () => { try { if (status.playing) player.pause(); else { if (status.didJustFinish) await player.seekTo(0); player.play(); void trackListen({ platform: 'mobile' }); } } catch { setControlError(true); } }}>{status.playing ? 'Tạm dừng' : 'Phát âm thanh'}</Button>
    <Text style={styles.text}>{time(status.currentTime)} / {time(status.duration)}</Text>
    <Pressable accessibilityRole="adjustable" accessibilityLabel="Vị trí phát âm thanh" accessibilityValue={{ min: 0, max: Math.max(1, status.duration), now: status.currentTime }} accessibilityActions={[{ name: 'increment', label: 'Tiến 10 giây' }, { name: 'decrement', label: 'Lùi 10 giây' }]} onAccessibilityAction={event => void seek(status.currentTime + (event.nativeEvent.actionName === 'increment' ? 10 : -10))} disabled={!status.isLoaded} onLayout={event => setWidth(event.nativeEvent.layout.width)} onPress={event => void seek(status.duration * event.nativeEvent.locationX / width)} style={styles.seek}>
      <View style={styles.track}><View style={[styles.fill, { width: `${status.duration > 0 ? Math.min(100, status.currentTime / status.duration * 100) : 0}%` }]} /></View>
    </Pressable>
    <View style={styles.volume}><Button variant="secondary" disabled={volume <= 0} onPress={() => changeVolume(Math.max(0, volume - 0.25))}>Giảm âm</Button><Text style={styles.text}>Âm lượng {Math.round(volume * 100)}%</Text><Button variant="secondary" disabled={volume >= 1} onPress={() => changeVolume(Math.min(1, volume + 0.25))}>Tăng âm</Button></View>
  </View>;
}
const styles = StyleSheet.create({
  media: { gap: spacing.sm }, video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.sidebar, borderRadius: radius.md },
  text: { color: colors.textSecondary, fontFamily: typography.family.regular, fontSize: typography.size.sm }, error: { color: colors.error, fontFamily: typography.family.regular, lineHeight: 22 },
  seek: { minHeight: 48, justifyContent: 'center' }, track: { height: 8, borderRadius: radius.full, backgroundColor: colors.border }, fill: { height: 8, borderRadius: radius.full, backgroundColor: colors.primary }, volume: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
