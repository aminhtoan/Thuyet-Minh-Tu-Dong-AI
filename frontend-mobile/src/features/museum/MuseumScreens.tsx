import { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { museumAssets } from './assets.generated';
import { publicMuseum, publishedExhibitions, findPublicVideo, languageAvailable, publicSourceUrl } from './catalog';
import { MuseumFrame, MuseumImage, MuseumLink, MuseumTitle } from './MuseumUI';
import { ms } from './theme';

function Intro() {
  return <View style={ms.section}><MuseumImage path={publicMuseum.images.museumIntro.src} alt={publicMuseum.images.museumIntro.alt} /><Text style={ms.eyebrow}>Lắng nghe quá khứ</Text><Text accessibilityRole="header" style={ms.heading}>Gìn giữ ký ức. Kết nối hôm nay.</Text>
    <Text style={ms.body}>Bảo tàng Chứng tích Chiến tranh là điểm khởi đầu cho hành trình tìm hiểu lịch sử qua những câu chuyện về chiến tranh và con người.</Text>
    <Text style={ms.body}>Website hướng đến trải nghiệm khám phá và lắng nghe thuyết minh, giúp người xem tiếp cận nội dung bảo tàng bằng nhiều ngôn ngữ.</Text>
  </View>;
}
function Topics() {
  return <View style={ms.section}>{publicMuseum.topics.map(topic => {
    const image = publicMuseum.images[topic.imageSlot as keyof typeof publicMuseum.images];
    // Preview cards are not published exhibitions: no fabricated detail links.
    return <View key={topic.title} style={ms.card}><MuseumImage path={image.src} alt={image.alt} /><Text accessibilityRole="header" style={ms.subheading}>{topic.title}</Text><Text style={ms.body}>{topic.description}</Text></View>;
  })}</View>;
}
export function MuseumHomeScreen() {
  const [heroFailed, setHeroFailed] = useState(false);
  return <MuseumFrame><View style={ms.hero}>
    {!heroFailed && <Image source={museumAssets[publicMuseum.images.hero.src]} style={ms.heroImage} resizeMode="cover" accessible={false} onError={() => setHeroFailed(true)} />}
    <View style={ms.heroCopy}><Text style={[ms.eyebrow, ms.whiteText]}>Bảo tàng Chứng tích Chiến tranh</Text><Text accessibilityRole="header" style={[ms.title, ms.whiteText]}>Những câu chuyện lịch sử từ hiện thực.</Text><Text style={[ms.body, ms.whiteText]}>Một không gian để tìm hiểu về chiến tranh, lắng nghe những câu chuyện con người và suy ngẫm về giá trị của hòa bình.</Text><MuseumLink href="/kham-pha" primary>Khám phá bảo tàng</MuseumLink><MuseumLink href="/thuyet-minh" primary>Xem thuyết minh</MuseumLink></View>
    </View><Intro /><MuseumLink href="/ve-bao-tang">Tìm hiểu về bảo tàng</MuseumLink>
    <Text accessibilityRole="header" style={ms.heading}>Không gian trưng bày</Text><Topics />
    <MuseumTitle title="Lắng nghe theo cách của bạn" description="Khám phá những câu chuyện lịch sử qua nhiều ngôn ngữ, kết nối ký ức với người nghe trên khắp thế giới." />
    <View style={ms.row}>{publicMuseum.narrationLanguages.map(language => <View key={language.code} style={[ms.card, ms.language]}><Text accessible={false} style={ms.icon}>{language.icon}</Text><Text style={ms.subheading}>{language.label}</Text><Text style={ms.small}>{language.name}</Text><View style={ms.badge}><Text style={ms.small}>Đang chuẩn bị</Text></View></View>)}</View>
    <View style={ms.card}><MuseumImage path={publicMuseum.videos[0]?.posterUrl ?? publicMuseum.images.featuredVideo.src} alt="Video giới thiệu Bảo tàng Chứng tích Chiến tranh" poster /><Text style={ms.eyebrow}>Thuyết minh nổi bật</Text><Text accessibilityRole="header" style={ms.heading}>Một hành trình qua những câu chuyện</Text><Text style={ms.body}>Video thuyết minh về Bảo tàng Chứng tích Chiến tranh.</Text><MuseumLink href="/thuyet-minh" primary>Đến trang Thuyết minh</MuseumLink></View>
    <View style={ms.section}><Text accessibilityRole="header" style={ms.heading}>Dành thời gian để khám phá.</Text><Text style={ms.body}>Mỗi câu chuyện là một lời mời tìm hiểu và suy ngẫm.</Text><MuseumLink href="/kham-pha" primary>Bắt đầu khám phá</MuseumLink></View>
  </MuseumFrame>;
}
export function MuseumExploreScreen() {
  return <MuseumFrame current="Khám phá"><MuseumTitle eyebrow="Bảo tàng Chứng tích Chiến tranh" title="Khám phá bảo tàng" description="Dành thời gian tìm hiểu, lắng nghe và suy ngẫm về những câu chuyện lịch sử." />
    <Text accessibilityRole="header" style={ms.heading}>Tiếp cận lịch sử qua từng góc nhìn.</Text><Text style={ms.body}>Không gian trưng bày là nơi kết nối câu chuyện, hình ảnh và tư liệu, gợi mở những suy ngẫm về con người và giá trị của hòa bình.</Text><Text accessibilityRole="header" style={ms.heading}>Các chuyên đề</Text>
    {publishedExhibitions.length ? publishedExhibitions.map(entry => <View key={entry.slug} style={ms.card}><Text style={ms.heading}>{entry.title}</Text><Text style={ms.body}>{entry.summary}</Text><MuseumLink href={{ pathname: '/kham-pha/[slug]', params: { slug: entry.slug } }}>Khám phá chuyên đề</MuseumLink></View>) : <Topics />}
    <MuseumLink href="/thuyet-minh">Đến trang Thuyết minh</MuseumLink></MuseumFrame>;
}
export function MuseumAboutScreen() {
  return <MuseumFrame current="Về bảo tàng"><MuseumTitle eyebrow="Bảo tàng Chứng tích Chiến tranh" title="Về bảo tàng" description="Một không gian để tìm hiểu về chiến tranh, lắng nghe những câu chuyện con người và suy ngẫm về giá trị của hòa bình." /><Intro /><MuseumLink href="/kham-pha" primary>Khám phá bảo tàng</MuseumLink>
    <View style={ms.card}><Text accessibilityRole="header" style={ms.heading}>Về bảo tàng</Text><Text style={ms.body}>Không gian trưng bày là nơi kết nối câu chuyện, hình ảnh và tư liệu, gợi mở những suy ngẫm về con người và giá trị của hòa bình.</Text></View>
    <View style={ms.card}><Text accessibilityRole="header" style={ms.heading}>Hành trình khám phá</Text><Text style={ms.body}>Dành thời gian tìm hiểu, lắng nghe và suy ngẫm về những câu chuyện lịch sử. Mỗi câu chuyện là một lời mời tìm hiểu và suy ngẫm.</Text></View>
  </MuseumFrame>;
}
export function MuseumVideosScreen() {
  return <MuseumFrame current="Thuyết minh"><MuseumTitle eyebrow="Bảo tàng Chứng tích Chiến tranh" title="Thuyết minh bảo tàng" description="Lắng nghe những câu chuyện lịch sử qua video và ngôn ngữ của bạn." />
    {publicMuseum.videos.length ? publicMuseum.videos.map(video => <View key={video.slug} style={ms.card}><MuseumImage path={video.posterUrl} alt={video.title} poster /><Text accessibilityRole="header" style={ms.heading}>{video.title}</Text><Text style={ms.body}>{video.description}</Text><MuseumLink primary href={{ pathname: '/thuyet-minh/[slug]', params: { slug: video.slug } }}>Xem video</MuseumLink></View>) : <Text style={ms.body}>Chưa có video được công bố.</Text>}
  </MuseumFrame>;
}
export function MuseumVideoDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const video = findPublicVideo(slug);
  const [sourceError, setSourceError] = useState(false);
  const [opening, setOpening] = useState(false);
  const sourceUrl = video && publicSourceUrl(video);
  async function openSource() {
    if (!sourceUrl || opening) return;
    setOpening(true); setSourceError(false);
    try { await Linking.openURL(sourceUrl); } catch { setSourceError(true); } finally { setOpening(false); }
  }
  return <MuseumFrame current="Thuyết minh">{video ? <>
    <MuseumTitle eyebrow="Video thuyết minh" title={video.title} description={video.description} />
    <View style={ms.row}>{publicMuseum.languages.map(language => <View key={language.code} accessible accessibilityState={{ disabled: !languageAvailable(video, language.code) }} accessibilityLabel={`${language.name}: ${languageAvailable(video, language.code) ? 'Sẵn sàng tại nguồn' : 'Đang chuẩn bị'}`} style={[ms.card, ms.language]}><Text style={ms.subheading}>{language.name}</Text><Text style={ms.small}>{languageAvailable(video, language.code) ? 'Sẵn sàng' : 'Đang chuẩn bị'}</Text></View>)}</View>
    <MuseumImage path={video.posterUrl} alt={video.title} poster /><Text style={ms.body}>Video được mở tại nguồn gốc.</Text>
    {sourceUrl && <Pressable accessibilityRole="link" accessibilityLabel="Xem video tại nguồn — mở ứng dụng hoặc trình duyệt" accessibilityState={{ disabled: opening, busy: opening }} disabled={opening} onPress={() => void openSource()} style={({ pressed }) => [ms.link, ms.primary, pressed && ms.primaryPressed]}><Text style={[ms.linkText, ms.whiteText]}>{opening ? 'Đang mở video...' : 'Xem video tại nguồn'}</Text></Pressable>}
    {sourceError && <Text accessibilityRole="alert" style={ms.body}>Không thể mở nguồn video. Vui lòng kiểm tra kết nối hoặc ứng dụng xem video.</Text>}
    <Text style={ms.small}>{video.rights.credit}{'\n'}{video.rights.license}</Text>
  </> : <MuseumTitle title="Không tìm thấy video" description="Đường dẫn này chưa có video được công bố." />}<MuseumLink href="/thuyet-minh">Quay lại danh sách video</MuseumLink><MuseumLink href="/kham-pha" primary>Khám phá bảo tàng</MuseumLink></MuseumFrame>;
}
export function MuseumExhibitionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const entry = publishedExhibitions.find(item => item.slug === slug);
  return <MuseumFrame current="Khám phá">{entry ? <>
    <MuseumTitle eyebrow="Chuyên đề" title={entry.title} description={entry.summary} />
    {entry.image && <><MuseumImage path={entry.image.src} alt={entry.image.alt} /><Text style={ms.small}>{entry.image.caption}{'\n'}{entry.image.credit}</Text></>}
    {entry.sections.map((section, index) => <View key={index} style={ms.section}><Text accessibilityRole="header" style={ms.heading}>{section.heading}</Text>{section.paragraphs.map((paragraph, number) => <Text key={number} style={ms.body}>{paragraph}</Text>)}</View>)}
    <Text style={ms.small}>Nguồn: {entry.source.label}{'\n'}{entry.source.reference}</Text>
  </> : <MuseumTitle title="Không tìm thấy chuyên đề" description="Đường dẫn này chưa có chuyên đề được công bố." />}<MuseumLink href="/kham-pha">Quay lại Khám phá</MuseumLink></MuseumFrame>;
}
