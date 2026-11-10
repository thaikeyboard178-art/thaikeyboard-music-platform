# Curriculum Update Report — Rhythm Training V1

## Presentation decisions — APPROVED OWNER DECISION, 2026-11-11

Nguồn: chủ sản phẩm xác nhận lúc03:04:52 +07:00. Ba mục trước đây PROPOSED đã chuyển sang **APPROVED**; quyết định presentation không cấp quyền triển khai runtime.

**Beam notation — APPROVED.** Quy tắc này áp dụng cho grouping **eighth notes**:3/8 mỗi móc đơn hiển thị riêng bằng **flag**, không beam ba móc đơn, thể hiện3 phách đơn độc lập.6/8 beam từng nhóm 3 theo **3+3**, không qua ranh giới hai phách phức.9/8 beam từng nhóm 3 theo **3+3+3**, không qua ranh giới ba phách phức. Sixteenth notes, rests và mixed-duration patterns theo notation rules phù hợp nhưng không được làm mất ranh giới phách/phách phức; không tự suy rộng rule ba móc đơn thành rule ba sounding attacks bỏ qua rest. Những ví dụ secondary-beam/rest/mixed chi tiết chưa quy định được ghi riêng, không hỏi lại grouping eighth đã chốt.

**Counting — APPROVED.** Đây là ba phương thức presentation/reference, không phải ba exercise kinds hay shared-session modes mới.

| Phương thức | Quyết định đã chốt |
|---|---|
| App Voice Counting | App tự đọc **số bằng tiếng Anh mặc định**, ví dụ **One, Two, Three...**; không dùng Vietnamese-first voice hoặc một syllable tiếng Việt bắt buộc làm default |
| Visual Counting | Hiện **con số tương ứng vị trí đếm**; người học tự đếm bằng ngôn ngữ muốn, **không bắt buộc tiếng Anh** |
| Metronome | Âm **tick, tick, tick...**, **không cần đọc số hoặc syllable** |

Không đồng nhất ngôn ngữ hiển thị số với ngôn ngữ phát âm tự động. English-default app voice không ép ngôn ngữ tự đếm hoặc đổi Vietnamese-first UI copy. Vị trí phách/subdivision vẫn từ canonical data; không suy đổi technical pulse hoặc tự tạo chuỗi phonetic subdivision chưa được quy định.

**Accent presentation — APPROVED.** Được dùng **Text-based** (Mạnh–Vừa–Nhẹ hoặc Mạnh–Nhẹ–Nhẹ tùy meter; có thể phân biệt font weight, độ đậm, ranh giới nhóm) hoặc **Symbol-based** (gạch nối, gạch dưới hoặc ký hiệu đồ họa; được phép dùng màu phân biệt cấp trọng âm). **Không bắt buộc phối hợp chữ + ký hiệu + màu**. **Nếu dùng màu**, phải đảm bảo **độ tương phản và khả năng nhận biết**; không tự thêm blanket rule bắt buộc chữ hoặc cấm màu-only trái quyết định. Strong=Mạnh, Medium=Vừa, Weak=Nhẹ; giữ hierarchy Mạnh>Vừa>Nhẹ và các vector3/8 `Sww`,6/8 `Sww|Mww`,9/8 `Sww|Mww|Mww`.

Giữ nguyên curriculum placement, meter semantics, technical pulse, subdivision, PPQ480 và **existing `segment.accent` schema**. Không sửa VexFlow, source/test, audio engine, UI/catalog/route activation, database, shared architecture, dependencies/infra, Note Reading hoặc WordPress; không deploy. APPROVED tài liệu không phải implementation/test-pass/teacher signoff. Xem [Decision Review](./Decision-Review.md).

> **Đính chính Level 6 đã chốt bởi chủ sản phẩm — 2026-11-11:** 3/8 là Simple Triple với3 phách đơn móc đơn, **Mạnh – Nhẹ – Nhẹ**; không có một phách phức. 6/8 có 2 phách phức, **Mạnh – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ**. 9/8 có 3 phách phức, **Mạnh – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ**. Mỗi phách phức=đen chấm dôi720 ticks gồm 3 phách đơn/subdivisions móc đơn240 ticks. Bar-level accent=Mạnh đầu ô; secondary beat accent=Vừa đầu các phách phức sau; Mạnh > Vừa > Nhẹ là quan hệ đã được xác nhận, không còn chờ hỏi lại. `S`=Mạnh, `M`=Vừa, `w`=Nhẹ: `Sww`, `Sww\|Mww`, `Sww\|Mww\|Mww`; cấp phách phức `S-M`, `S-M-M`. Trong3/8, mỗi móc đơn là một phách đơn độc lập, không phải subdivision của một phách phức giả. Beam notation, ba phương thức counting và accent presentation đã APPROVED theo quyết định03:04:52 +07:00; xem [Decision Review](./Decision-Review.md). Không hỏi lại hoặc khôi phục ba đề xuất cũ. Đính chính này chỉ sửa tài liệu, không sửa code/runtime hoặc tự triển khai gain/velocity/UI.

**Trạng thái:** documentation-only. Placement curriculum đã được duyệt và đã được đồng bộ trong các tài liệu dưới đây; quy ước nhạc lý/trọng âm Level6 đã được chủ sản phẩm xác nhận; ba quyết định presentation beam/counting/accent đã APPROVED; chỉ các chi tiết notation/voice chưa quy định và pilot không liên quan còn pending. Không có source code, test source, runtime, UI, audio, database, infrastructure, dependency, shared architecture, Note Reading, catalog, metronome, MIDI, microphone, Phase 3/4/5, deploy nào bị thay đổi. README, TODO, plan và nhãn phạm vi trong báo cáo Phase2 chỉ được cập nhật Markdown để dẫn chiếu curriculum mới; không sửa kết quả test/SHA lịch sử hoặc implementation bên dưới. Các Markdown được liệt kê trong report này là những thay đổi có chủ đích.

## Tóm tắt điều chỉnh

Các bản tài liệu đã được quy về **6 Level chính + 1 Bonus**, với **Lessons, Practice và Assessment cho từng Level/Bonus**. Level 1 chỉ giữ quarter rest trong scored core. Level 2 dạy eighth notes, eighth rests và binary quarter subdivision trong formal 4/4 scaffold; formal 2/4 và 3/4 được deferred đến Level 3. Level 3 là một unit Simple Meter thống nhất gồm 2/4, 3/4 và 4/4. Level 4 dạy dots/ties, còn dotted eighth được deferred đến sixteenth grid của Level 5. Level 5 dạy sixteenths, combinations và advanced rhythms, đồng thời consolidation có kiểm soát các outcome cũ của L7/L8 nhưng không tạo Level 7/8 mới. Level 6 là một knowledge group duy nhất **Grouping in Threes**, không tách thành ba course 3/8, 6/8 và 9/8. Bonus 2/2 là optional learner progression nhưng vẫn là V1-supported feature.

## Bảng before/after curriculum

| Phạm vi | Trước / legacy hoặc đề xuất cũ | Sau / curriculum V1 đã đồng bộ |
|---|---|---|
| Cấu trúc tổng thể | Tám data-only levels legacy; các proposal cũ phân bổ meter ở nhiều vị trí khác nhau | Sáu Level chính + Bonus 2/2; đây là 7 meter được hỗ trợ về mặt nội dung: 6 core + 1 Bonus |
| Level 1 | Whole/half/quarter và vocabulary rest rộng hơn trong các mô tả legacy | Black/quarter, half, whole notes và **quarter rest only** trong scored core |
| Level 2 | Một số tài liệu cũ cho phép transfer 2/4, 3/4, 4/4 sớm | Eighth notes, eighth rests và binary quarter subdivision trong **formal 4/4 scaffold**; formal 2/4 và 3/4 deferred đến Level 3 |
| Level 3 | Simple-meter transfer có thể bị xem như phần mở rộng của Level 2 | Một unit Simple Meter duy nhất: 2/4, 3/4, 4/4; không phải ba course độc lập |
| Level 4 | Dots/ties cùng các đề xuất meter transfer chưa ổn định | Dots/ties; dotted eighth không nằm ở Level 4 và được hoãn đến sixteenth grid Level 5 |
| Level 5 | Sixteenths/combinations; old L7/L8 từng được mô tả như level riêng | Sixteenths, combinations, advanced rhythms và controlled consolidation của old L7/L8; **không tạo L7/L8 mới** |
| Level 6 | Có mô tả cũ chỉ dành riêng cho 6/8 hoặc các course meter độc lập | Một knowledge group Grouping in Threes theo trình tự 3/8 → 6/8 → 9/8; giữ riêng simple/compound identity |
| Bonus | 2/2 từng được đặt như transfer ở vị trí Level 4 hoặc proposal riêng | Bonus 2/2 optional cho learner nhưng feature V1 bắt buộc phải hỗ trợ; có Lessons, Practice, Assessment và không phải graduation requirement |
| Outcome và scoring | Có nguy cơ lẫn onset, duration và per-tap feedback | Giữ duration-authority, exact fill, rest/tie semantics, onset-only tap và whole-exercise `+10/+0`; diagnostics vẫn local, không tạo partial shared score |

## Level 6 — tiến trình bắt buộc đã ghi nhận

Level 6 được ghi nhất quán trong [Curriculum-V1.md](./Curriculum-V1.md), [Rhythm-Training-V1-Specification.md](./Rhythm-Training-V1-Specification.md), [Meter-and-Notation-Requirements.md](./Meter-and-Notation-Requirements.md), [Test-and-Release-Acceptance.md](./Test-and-Release-Acceptance.md) và các bản scope/spec tương ứng:

1. Nhận diện **một group gồm 3 eighths** trong 3/8.
2. Mở rộng thành **hai groups** trong 6/8; giữ hai dotted-quarter pulses và grouping 3+3.
3. Mở rộng thành **ba groups** trong 9/8; giữ ba dotted-quarter pulses và grouping 3+3+3.
4. So sánh group count, pulse count và vị trí accent; teaching group không được thay thế technical pulse.
5. Phân tích notes, rests, dots và ties; rest tiêu thụ duration, tie continuation không tạo attack mới.
6. Combined Practice và Assessment phải bao phủ cả 3/8, 6/8 và 9/8 trong cùng một unified knowledge group.

Đính chính đã được chủ sản phẩm chốt:3/8 `Sww`,6/8 `Sww|Mww`,9/8 `Sww|Mww|Mww`. Phách đơn là móc đơn; phách phức là đen chấm dôi gồm 3 phách đơn. Mạnh là bar-level accent đầu ô; Vừa là secondary beat accent đầu các phách phức sau, Nhẹ ở vị trí còn lại. Các chuỗi cũ bị thay thế và semantics không còn pending. Beam/count/UI đã APPROVED theo quyết định03:04:52 +07:00, nhưng chưa triển khai.

## Tác động kỹ thuật và chính sách 9/8

| Meter | Capacity / PPQ | Technical pulse | Pulse starts | Structural grouping | Teaching string |
|---|---:|---:|---|---|---|
| 3/8 | `720`, PPQ `480` | 3 eighth pulses × `240` | `[0,240,480]` | Simple triple; một teaching group | `Sww` |
| 6/8 | `1440`, PPQ `480` | 2 dotted-quarter pulses × `720` | `[0,720]` | Compound duple; `3+3` | `Sww\|Mww` |
| 9/8 | `2160`, PPQ `480` | 3 dotted-quarter pulses × `720` | `[0,720,1440]` | Compound triple; `3+3+3` | `Sww\|Mww\|Mww` |

Các tài liệu đã bổ sung/giữ các điểm sau cho 9/8:

- `9/8` phải giữ numerator `9`, denominator `8` trong notation projection; không rút thành `3/8` chỉ vì cùng eighth grid.
- Chín eighths, ba dotted quarters, dotted half + dotted quarter và chín eighth rests là các ví dụ exact-fill hợp lệ; whole note là underfill và whole + quarter là overfill.
- Strict voice layer `16384 × 9/8 = 18432` được tách khỏi canonical PPQ bar `2160`; Fraction/parity layer là lớp liên kết, không thay thế authority của canonical ticks.
- 3/8 đã chốt Simple Triple với3 phách đơn240 ticks, không một phách phức720. Nhãn lịch sử “phách chính1” bị thay thế, không yêu cầu giáo viên xác nhận lại.
- Quy ước trọng âm Mạnh/Vừa/Nhẹ đã xác nhận; structural overlay không tự biến thành explicit segment accent, đổi onset/rest/tie hoặc numerical gain. Hai hình thức accent/optionalcolor đã APPROVED;visualtokens/encoding chi tiết chưa triển khai.

## Các chính sách duration, exercise và biên giới được giữ nguyên

- PPQ canonical `480`: quarter `480`, half `960`, whole `1920`, eighth `240`, sixteenth `120`, dotted quarter `720`.
- Duration descriptor là authority; bar phải exact-fill; rest chiếm duration nhưng không tạo onset; tie continuation không tạo attack thứ hai.
- Dotted eighth bị deferred đến Level 5 khi sixteenth grid đã mở; không được kéo ngược vào Level 4.
- Tap Rhythm là onset-only, không đo hold duration; vẫn dùng `currentTime`, confidence và matching windows hiện hành.
- Một graded exercise chỉ có một shared answer: đúng `+10`, sai `+0`; local onset/duration/meter/tie diagnostics không tạo partial shared score.
- Bốn local exercise kinds vẫn là Multiple Choice, Tap Rhythm, Listen & Identify và Count the Beat; Free và Challenge vẫn là hai shared session wrappers duy nhất.
- Không thêm tuplets, swing, mixed meter, polyrhythm, microphone, MIDI, audio scheduler, UI route, catalog activation, database hoặc shared progress schema trong update này.
- Các acceptance/test ID trong tài liệu chỉ là future proposals. Không có runtime test mới được chạy; historical `436/436` không phải fresh result và không phải bằng chứng hỗ trợ meter mới.

## Các Markdown đã cập nhật

Các path dưới đây là các tài liệu đã được ghi nhận trong map output và được giữ làm các bản hiện hành/superseded pointer phù hợp:

1. [`Curriculum-V1.md`](./Curriculum-V1.md) — bản authoritative trong repository.
2. [`Meter-and-Notation-Requirements.md`](./Meter-and-Notation-Requirements.md) — registry bảy meter, duration/beam/strict-voice requirements.
3. [`Test-and-Release-Acceptance.md`](./Test-and-Release-Acceptance.md) — acceptance proposals, không phải test result.
4. [`Music-Education-Review-Scope.md`](./Music-Education-Review-Scope.md) — scope review trong repository.
5. [`Rhythm-Training-V1-Specification.md`](./Rhythm-Training-V1-Specification.md) — specification hiện hành trong repository.
6. `/home/ubuntu/rhythm-training-design/curriculum.md` — full copy curriculum hiện hành ngoài repository.
7. `/home/ubuntu/rhythm-training-design/Rhythm-Training-V1-Specification.md` — full copy specification hiện hành ngoài repository.
8. [`Generation-and-Assessment-Requirements.md`](./Generation-and-Assessment-Requirements.md) — yêu cầu generator/assessment tại đường dẫn chuẩn trong repository.
9. `/home/ubuntu/six-meter-review/Music-Education-Review-Scope.md` — full copy review scope ngoài repository.
10. `/home/ubuntu/six-meter-review/Rhythm-Training-V1-Six-Meter-Specification.md` — historical filename đã chuyển thành superseded pointer, không còn là six-meter canonical spec.

Hai full copy curriculum/specification ngoài repository vẫn là bản hiện hành tương ứng với bản trong repository; các bản Markdown được so sánh/đồng bộ theo nội dung, không tự tạo Git commit; Git chỉ được parent thực hiện sau kiểm tra documentation-only. Filename six-meter cũ chỉ trỏ đến seven-meter specification hiện hành và không được dùng làm canonical six-meter source.

## Quyết định presentation đã APPROVED và remaining details

Ba mục P-01/P-02/P-03 chuyển PROPOSED sang APPROVED: 3/8 móc đơn flag riêng, 6/8 beam 3+3 và 9/8 beam 3+3+3 không qua ranh giới phách phức; App Voice Counting tiếng Anh mặc định, Visual Counting hiện số để tự đếm bằng ngôn ngữ tùy ý, Metronome tick; accent chữ hoặc ký hiệu với màu tùy chọn đủ tương phản/khả năng nhận biết, không bắt buộc phối hợp cả ba.

Còn pending: secondary-sixteenth/rest/mixed notation examples chi tiết (giữ boundaries); voice assets/chi tiết đọc subdivision chưa quy định; tempo/assessment quota/density/matching/readiness/pilot; Bonus display và legacy seed/version policy. Không hỏi lại presentation, không đổi curriculum/hierarchy/pulse/schema hoặc triển khai runtime.

## GitHub — cập nhật tài liệu đã lưu

Commit documentation-only `636524c4a741b35bb5491a80e7deccd627974ec9` đã push thành công vào `thaikeyboard178-art/thaikeyboard-music-platform`, nhánh `main`; khi push hoàn tất, `HEAD == origin/main` và worktree sạch. Commit chứa đúng13 Markdown (7 tài liệu mới,6 Markdown metadata/historical-reference sửa), không có source/test/config/schema/asset thay đổi. Auto-publish tắt; không deploy hay rewrite/force-push history. Bản ghi handoff/TODO hoàn tất và lời làm rõ guardrails trong generator requirements được lưu tiếp bằng một documentation-only commit, không đổi runtime.

**Runtime status:** code vẫn tám legacy data-only levels và bốn implemented meters; curriculum mới và bảy-meter registry chưa triển khai. **Test status:** chỉ kiểm tra tài liệu, công thức bằng `Fraction`, local links/table integrity và SHA-256 bảo toàn251 file; không chạy fresh runtime tests hoặc sử dụng436/436 lịch sử như bằng chứng cho curriculum mới.

## Bảo toàn và tài liệu lịch sử đã đồng bộ

Bảy tài liệu hiện hành mới nằm trong `client/src/modules/rhythm-training/docs/`. Sáu Markdown hiện hữu được cập nhật chỉ để thêm dẫn chiếu/phạm vi: root `README.md`, root `TODO.md`, module `README.md`, `plan.md`, `TODO.md` và `Phase-2-Implementation-Report.md`. Nội dung implementation/test/SHA lịch sử giữ nguyên; code hiện vẫn tám level policies và bốn meter. README root còn sửa câu trạng thái cũ cho đúng: Rhythm có library inert Phase1/Phase2 nhưng không có UI/route/audio hoạt động.

Các tài liệu nghiên cứu/review cũ dưới đây có nhãn lịch sử/superseded và liên kết tới curriculum hiện hành. Các quan sát source thực tế trong chúng vẫn được giữ làm lịch sử; các placement cũ không còn là yêu cầu active:

- `/home/ubuntu/rhythm-training-design/audio-timing-research-notes.md`
- `/home/ubuntu/rhythm-training-design/audio-timing.md`
- `/home/ubuntu/rhythm-training-design/current-source-context.md`
- `/home/ubuntu/rhythm-training-design/exercise-modes.md`
- `/home/ubuntu/rhythm-training-design/research-notes-exercise-modes.md`
- `/home/ubuntu/rhythm-training-design/research-notes-rhythm.md`
- `/home/ubuntu/rhythm-training-design/research-notes.md`
- `/home/ubuntu/rhythm-training-design/rhythm-data.md`
- `/home/ubuntu/rhythm-training-design/test-phases.md`
- `/home/ubuntu/rhythm-training-design/ui-integration.md`
- `/home/ubuntu/rhythm-training-design/ui-research-notes.md`
- `/home/ubuntu/six-meter-review/Six-Meter-Impact-and-Acceptance-Review.md`
- `/home/ubuntu/six-meter-review/answer-signatures.md`
- `/home/ubuntu/six-meter-review/beam-accents.md`
- `/home/ubuntu/six-meter-review/curriculum.md`
- `/home/ubuntu/six-meter-review/future-audio.md`
- `/home/ubuntu/six-meter-review/generator-policies.md`
- `/home/ubuntu/six-meter-review/meter-capacity.md`
- `/home/ubuntu/six-meter-review/model-schema.md`
- `/home/ubuntu/six-meter-review/notation-renderer.md`
- `/home/ubuntu/six-meter-review/tempo-conversion.md`
- `/home/ubuntu/six-meter-review/test-fixtures.md`
- `/home/ubuntu/six-meter-review/timeline-coordinates.md`

Đã đối chiếu SHA-256 với snapshot trước chỉnh sửa: **251 file tracked được bảo vệ giữ nguyên byte**, ngoài sáu Markdown được phép chỉnh. Các file mới trong repository đều là bảy Markdown nói trên. Không tạo/đổi source hoặc test, không gọi DB/WordPress, không chỉnh cấu hình Manus/infra, không activate UI/catalog, không triển khai Audio Scheduler/MIDI/microphone hay production. Git commit tài liệu không đồng nghĩa với deployment; auto-publish được xác nhận tắt.

Đây là nhiệm vụ tài liệu: không chạy pnpm test/check/build, không dùng 436/436 lịch sử như presentation pass. Semantics và ba presentation policies đã APPROVED; runtime implementation chưa được phép. Xem [Music Education Review](./Music-Education-Review-Scope.md) và [Decision Review](./Decision-Review.md).
