import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { env } from '../../config/env';
import { fetchPublishedVideos, loadPublicVideo, publishedVideoLanguage, type PublishedNarrationVideo, type VideoPhase } from './publicVideo.mjs';
import { ms, museum } from './theme';

export function PublicVideoPlayer({ video, onClose, onRetry }: { video: PublishedNarrationVideo; onClose: () => void; onRetry: () => void }) {
  const player = useVideoPlayer(null, instance => { instance.loop = false; instance.staysActiveInBackground = false; });
  const [phase, setPhase] = useState<VideoPhase>('LOADING');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(); pending.current = controller;
    const dispose = loadPublicVideo(player, video, env.apiBaseUrl, controller.signal, setPhase);
    return () => { controller.abort(); dispose(); };
  }, [player, video]);
  useFocusEffect(useCallback(() => () => pending.current?.abort(), []));
  return <View style={ms.card}>
    <Text accessibilityRole="header" style={ms.subheading}>{video.title} · {publishedVideoLanguage(video.languageCode)}</Text>
    {phase === 'ERROR' ? <>
      <Text accessibilityRole="alert" style={ms.body}>Video đã ngừng công khai, không còn khả dụng hoặc kết nối bị lỗi. Tải lại danh sách để kiểm tra.</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={ms.link}><Text style={ms.linkText}>Tải lại danh sách</Text></Pressable>
    </> : <>
      <VideoView player={player} nativeControls contentFit="contain" style={styles.video}
        accessibilityLabel={`Video ${video.title} — ${publishedVideoLanguage(video.languageCode)}`} />
      {phase === 'LOADING' && <Text accessibilityLiveRegion="polite" style={ms.body}>Đang tải video…</Text>}
    </>}
    <Pressable accessibilityRole="button" onPress={() => { pending.current?.abort(); onClose(); }} style={ms.link}><Text style={ms.linkText}>Đóng video</Text></Pressable>
  </View>;
}

export function PublicVideoSection() {
  const [videos, setVideos] = useState<PublishedNarrationVideo[]>([]);
  const [selected, setSelected] = useState<string | null>(null), [focused, setFocused] = useState(false);
  const [phase, setPhase] = useState<VideoPhase>('LOADING');
  const revision = useRef(0), pending = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setSelected(null); setVideos([]); setPhase('LOADING');
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const value = await fetchPublishedVideos(env.apiBaseUrl, controller.signal);
      if (current === revision.current) { if (controller.signal.aborted) setPhase('ERROR'); else { setVideos(value); setPhase('READY'); } }
    } catch { if (current === revision.current) setPhase('ERROR'); }
    finally { clearTimeout(timer); }
  }, []);
  useFocusEffect(useCallback(() => {
    setFocused(true); void reload();
    return () => { revision.current++; pending.current?.abort(); setSelected(null); setFocused(false); };
  }, [reload]));
  const active = videos.find(video => video.id === selected);
  return <View style={ms.section}>
    <Text accessibilityRole="header" style={ms.heading}>Video thuyết minh</Text>
    <Text style={ms.body}>Video MP4 thuyết minh đã được quản trị viên công khai.</Text>
    {phase === 'LOADING' && <Text accessibilityLiveRegion="polite" style={ms.body}>Đang tải video thuyết minh…</Text>}
    {phase === 'ERROR' && <View style={ms.card}><Text accessibilityRole="alert" style={ms.body}>Không thể tải danh sách video thuyết minh.</Text>
      <Pressable accessibilityRole="button" onPress={() => void reload()} style={ms.link}><Text style={ms.linkText}>Thử lại</Text></Pressable></View>}
    {phase === 'READY' && !videos.length && <Text style={ms.body}>Chưa có video MP4 thuyết minh được công khai.</Text>}
    {phase === 'READY' && videos.length > 0 && <>
      <Pressable accessibilityRole="button" onPress={() => void reload()} style={ms.link}><Text style={ms.linkText}>Tải lại danh sách video</Text></Pressable>
      {videos.map(video => <View key={video.id} style={ms.card}>
        <Text accessibilityRole="header" style={ms.subheading}>{video.title}</Text>
        <Text style={ms.body}>Thuyết minh · {publishedVideoLanguage(video.languageCode)} · {Math.round(video.duration)} giây</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Xem video ${video.title} — ${publishedVideoLanguage(video.languageCode)}`}
          accessibilityState={{ expanded: selected === video.id }} onPress={() => setSelected(video.id)} style={ms.link}><Text style={ms.linkText}>Xem video</Text></Pressable>
      </View>)}
    </>}
    {focused && active && <PublicVideoPlayer key={active.id} video={active} onClose={() => setSelected(null)} onRetry={() => void reload()} />}
  </View>;
}
const styles = StyleSheet.create({ video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: museum.navy, borderRadius: 12 } });
