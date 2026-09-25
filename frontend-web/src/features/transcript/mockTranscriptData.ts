import type { LanguageCode } from '../projects/types'

// Development-only sample copy. No speech recognition or media analysis occurs here.
export const mockTranscriptLines: Record<LanguageCode, readonly string[]> = {
  vi: [
    'Xin chào mọi người.',
    'Hôm nay chúng ta cùng khám phá vùng đất An Giang.',
    'Những cánh đồng rộng mở đón ánh nắng đầu ngày.',
    'Dọc theo dòng sông, cuộc sống diễn ra thật bình yên.',
    'Mỗi điểm dừng chân đều mang một câu chuyện riêng.',
    'Hệ thống sẽ giúp chuyển lời nói trong video thành văn bản.',
    'Bạn có thể rà soát và chỉnh sửa từng đoạn theo thời gian.',
    'Sau đó nội dung sẽ sẵn sàng cho bước dịch thuật.',
    'Giọng đọc phù hợp sẽ mang câu chuyện đến gần hơn với khán giả.',
    'Cảm ơn bạn đã theo dõi hành trình này.',
  ],
  en: [
    'Hello everyone.',
    'Today we are exploring a new story together.',
    'Every place has its own voice and rhythm.',
    'The original recording captures the details of the journey.',
    'Our workflow turns spoken words into editable text.',
    'You can review every segment alongside its timestamp.',
    'Corrections help keep the meaning clear and accurate.',
    'The next step will prepare this text for translation.',
    'A suitable voice can then bring the story to more people.',
    'Thank you for joining us.',
  ],
  ja: [
    'みなさん、こんにちは。', '今日は新しい物語をご紹介します。', 'この場所には独自の魅力があります。',
    '録音には旅の様子が残されています。', '話し言葉を編集できる文章にします。', '時間ごとに内容を確認できます。',
    '必要な部分を修正してください。', '次のステップでは翻訳を行います。', '適切な声を選ぶこともできます。', 'ご視聴ありがとうございました。',
  ],
  ko: [
    '여러분, 안녕하세요.', '오늘은 새로운 이야기를 소개합니다.', '이곳에는 특별한 매력이 있습니다.',
    '녹음에는 여행의 순간이 담겨 있습니다.', '음성을 편집할 수 있는 글로 바꿉니다.', '시간별로 내용을 확인할 수 있습니다.',
    '필요한 부분을 수정해 주세요.', '다음 단계에서는 번역을 준비합니다.', '적절한 목소리를 선택할 수도 있습니다.', '시청해 주셔서 감사합니다.',
  ],
}

export const mockSegmentStarts = [0, 4.2, 9.1, 14.8, 20.4, 26.3, 32.7, 39, 45.5, 52] as const
export const mockTranscriptDuration = 61
