# Rhythm Training V1 — Yêu cầu Nhịp và Ký hiệu

## Owner-approved active timing supersession — 2026-11-12

**APPROVED; active policy.** This supersedes conflicting older technical-pulse/BPM/default wording below, while preserving musical identity, grouping, and accents. PPQ remains 480; each eighth is 240 ticks.

| Meter | Canonical technical pulse | Pulses/bar | Default BPM |
|---|---|---:|---:|
| 2/4 | Quarter, 480 ticks | 2 | 100 |
| 3/4 | Quarter, 480 ticks | 3 | 100 |
| 4/4 | Quarter, 480 ticks | 4 | 100 |
| 3/8 | Eighth, 240 ticks | 3 | 180 |
| 6/8 | Eighth, 240 ticks | 6 | 180 |
| 9/8 | Eighth, 240 ticks | 9 | 180 |
| 2/2 | Half, 960 ticks | 2 | 100 |

Tempo is globally **30–300 BPM**, measured in the stated technical pulse unit. Musical grouping is separate and unchanged: 6/8 `3+3` / `Sww|Mww`; 9/8 `3+3+3` / `Sww|Mww|Mww`; 3/8 `Sww`. In particular, these group accents do not turn 6/8 or 9/8 into dotted-quarter technical pulses.

> **Historical-reading note:** The older meter matrix and clauses below that label the 6/8 or 9/8 dotted quarter as the technical BPM/metronome pulse are retained as historical text where they conflict with this approved table. Unaffected PPQ, duration, meter, notation, grouping, and accent requirements remain in force.

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

**Trạng thái:** đặc tả tài liệu; nhạc lý Level6 và ba quyết định presentation đã APPROVED, chưa triển khai. Chỉ các chi tiết notation/pilot chưa được quy định cụ thể còn pending.
**Phạm vi:** bảy meter V1 được hỗ trợ (sáu meter cốt lõi và Bonus 2/2), toán học nhịp, ánh xạ ký hiệu, beam và các ví dụ kiểm tra tính hợp lệ. Tài liệu này không thay đổi source code, test, database, UI, audio, MIDI, microphone, deploy hoặc kiến trúc dùng chung.

## 1. Nguyên tắc bất biến

Rhythm Training phải giữ một mô hình thời lượng duy nhất làm nguồn sự thật. Với `PPQ = 480`, mọi thời lượng viết được quy đổi bằng số nguyên tick; `Fraction` calculation hiện có hoặc tương đương phải tiếp tục là lớp tính toán chính xác. Không được suy ra pulse chỉ từ numerator, denominator hoặc nhãn simple/compound. Meter được tra cứu bằng cặp `(numerator, denominator)` chính xác.

Một **measure/bar** phải có tổng tick đúng bằng capacity của meter. Một **pulse** là đơn vị cảm nhận dùng cho tempo và đếm; nó không nhất thiết bằng một đơn vị mẫu giáo dục duy nhất. Một **structural grouping** mô tả bản chất nhạc lý của meter. Một **teaching grouping** chỉ là lớp trình bày/giảng dạy để giúp người học nhận ra các nhóm; nó không được ghi đè pulse count, pulse starts, capacity, tempo unit hoặc identity của meter.

Các accent giảng dạy chỉ là overlay. Không tự động ghi accent mạnh vào `segment.accent` của note nếu người dùng/fixture không yêu cầu explicit accent. Accent cấu trúc và accent explicit phải được giữ tách biệt; accent chỉ thay đổi gain hoặc cách hiển thị, không thay đổi onset time.

## 2. Ma trận bảy meter V1 — historical pulse wording superseded

> This retained matrix records the earlier dotted-quarter technical pulse for 6/8 and 9/8. Its meter identities and 3+3 / 3+3+3 musical grouping remain valid; use the active pulse/BPM table above for technical timing.

Các giá trị dưới đây là canonical với `PPQ = 480`. `Starts` là vị trí bắt đầu pulse trong một bar, tính bằng tick. `Structural grouping` mô tả grouping nhạc lý; `Teaching grouping/accent` là chuỗi nhấn dùng trong nội dung hướng dẫn, không phải một trường thay thế cho structural grouping.

| Meter | Vai trò | Bar capacity (ticks) | Pulse count | Pulse unit | Pulse starts (ticks) | Structural grouping | Teaching grouping / accent |
|---|---|---:|---:|---|---|---|---|
| `2/4` | Core, simple duple | 960 | 2 | quarter = 480 | `[0, 480]` | `2` quarter pulses; `S-W` | `S-W` |
| `3/4` | Core, simple triple | 1440 | 3 | quarter = 480 | `[0, 480, 960]` | `3` quarter pulses; `S-W-W` | `S-W-W` |
| `4/4` | Core, simple quadruple | 1920 | 4 | quarter = 480 | `[0, 480, 960, 1440]` | `4` quarter pulses; tối thiểu `S-W-M-W` khi dùng mức trung gian | `S-W-M-W` nếu lớp dạy cần medium; tối thiểu phải giữ downbeat mạnh |
| `3/8` | Core, simple triple | 720 | **3** | eighth = 240 | `[0, 240, 480]` | `3` independent eighth pulses; one teaching group, không phải một pulse 720 | **`Sww`**; một nhóm dạy gồm 3 móc đơn, nhưng vẫn là ba phách đơn độc lập |
| `6/8` | Core, compound duple | 1440 | 2 | dotted quarter = 720 | `[0, 720]` | `2` dotted-quarter pulses, mỗi pulse gồm `3` eighths: `3+3` | **`Sww\|Mww`**; hai nhóm dạy, mỗi nhóm 3 móc đơn |
| `9/8` | Core, compound triple | 2160 | **3** | dotted quarter = 720 | `[0, 720, 1440]` | `3` dotted-quarter pulses, mỗi pulse gồm `3` eighths: `3+3+3` | **`Sww\|Mww\|Mww`**; ba nhóm dạy, mỗi nhóm 3 móc đơn |
| `2/2` | Bonus, alla breve | 1920 | 2 | half = 960 | `[0, 960]` | `2` half-note pulses; `S-W` | `S-W`; tempo phải ghi rõ là **half-note BPM** |

### 2.1. Phân biệt 3/8, 6/8 và 9/8

`3/8` là Simple Triple đã xác nhận:3 phách đơn độc lập, mỗi phách=móc đơn240 ticks ở0,240,480, trọng âm Mạnh–Nhẹ–Nhẹ. Không coi720 ticks của cả ô là một phách phức. Nhãn nguồn cũ “phách chính1” là lịch sử bị thay thế, không còn chờ xác nhận nhạc lý.

`6/8` Compound Duple có 2 phách phức và `9/8` Compound Triple có 3 phách phức. Mỗi phách phức là đen chấm dôi720 ticks, gồm 3 phách đơn/subdivisions móc đơn240 ticks. Phách đơn khác phách phức. Accent trên eighth grid lần lượt `Sww|Mww` và `Sww|Mww|Mww`; ở cấp phách phức `S-M` và `S-M-M`. Đây là quyết định đã xác nhận, không phải phương án hierarchy cần educator duyệt lại.

Bar-level accent tại tick0 là Mạnh; secondary beat accents tại720 (6/8),720 và1440 (9/8) là Vừa; các eighth positions khác Nhẹ. Mạnh>Vừa>Nhẹ đã chốt. UI/encoding cụ thể chưa triển khai; không tự ghi structural accents vào `segment.accent`, không thêm attack ở rest hoặc tie continuation.

### 2.2. Đếm và tempo

Counting đã APPROVED theo ba phương thức: App Voice Counting tự đọc số bằng tiếng Anh mặc định (One, Two, Three...); Visual Counting hiện số tại vị trí canonical, người học tự đếm bằng ngôn ngữ muốn; Metronome tick, tick, tick... không cần số/syllable. Ngôn ngữ số hiển thị không đồng nhất với app voice. Không dùng `1-la-li` hoặc syllable tiếng Việt bắt buộc làm default voice; mọi vị trí phách/subdivision và tempo unit giữ nguyên.

`2/2` là Bonus tùy chọn trong progression. Pulse của nó là half note `960` tick; BPM phải được hiển thị và giải thích là **half-note BPM**, không được dùng quarter-BPM mà không đổi nhãn. Hai pulse bắt đầu tại `0` và `960`, với accent tương đối `S-W`. Việc `2/2` có cùng bar capacity với `4/4` không làm hai meter có cùng pulse semantics.

## 3. Canonical duration và validation

Công thức duration phải tiếp tục dùng integer/Fraction arithmetic:

- quarter = `480` tick;
- half = `960` tick;
- whole = `1920` tick;
- eighth = `240` tick;
- sixteenth = `120` tick;
- dotted duration = duration gốc cộng một nửa duration gốc, ví dụ dotted quarter = `720`, dotted half = `1440`, dotted eighth = `360`.

Validator phải kiểm tra đúng cặp meter, duration descriptor, dot policy, tie adjacency và tổng tick. Không được sửa hoặc làm tròn dữ liệu để vừa bar. Rests tiêu thụ đầy đủ duration nhưng không tạo onset. Tie continuation không tạo attack mới; tie tự nó **không bắt buộc beam phải tách**. Tie chỉ hợp lệ giữa các note segment kề nhau theo tie policy đã duyệt; tie vào rest hoặc tie member không kề nhau là invalid.

All-rest bar là dữ liệu canonical hợp lệ cho validator/notation nếu tổng duration đúng capacity, dù generator có thể tiếp tục có policy riêng không sinh pattern không có onset. Không tự động dùng whole-measure rest glyph có semantics phụ thuộc meter nếu fixture chưa định nghĩa rõ duration của glyph đó.

## 4. Ví dụ bắt buộc cho 9/8

Các ví dụ dưới đây phải được dùng làm định hướng cho validator, notation parity và tài liệu giáo dục. Chúng là yêu cầu đặc tả, không phải bằng chứng rằng code hiện tại đã hỗ trợ.

| Pattern 9/8 | Tính tick | Kết quả |
|---|---:|---|
| 9 eighth notes | `9 × 240 = 2160` | Valid; onset/pulse starts lần lượt theo grid `0..1920` bước `240` |
| 3 dotted-quarter notes | `3 × 720 = 2160` | Valid; một note trên mỗi dotted-quarter pulse |
| dotted half + dotted quarter | `1440 + 720 = 2160` | Valid; hai duration phủ đủ ba pulse về mặt tick |
| 9 eighth rests | `9 × 240 = 2160` | Valid all-rest bar; không có onset |
| one whole note | `1920 < 2160` | **Underfill, reject** |
| whole note + quarter note | `1920 + 480 = 2400 > 2160` | **Overfill, reject** |

Không phát minh hoặc ngầm hỗ trợ tuplets mới để lấp khoảng trống. Tuplets, swing, mixed meter và polyrhythm vẫn ngoài phạm vi V1 đã duyệt.

## 5. Quy tắc beam — APPROVED

Beam plan là presentation metadata, không ghi đè pulseIndex/pulseTicks/pulseStarts, structural accents hoặc duration validation. Rule eighth notes dưới đây đã chốt, không còn lựa chọn bar-wide beam cho3/8.

| Meter / nội dung | Eighth-note plan APPROVED | Sixteenth/rest/mixed-duration guardrail |
|---|---|---|
| 3/8 eighths | Mỗi móc đơn riêng bằng flag; không beam ba móc đơn;3 simple beats độc lập | Áp dụng notation rules phù hợp, không làm mất ranh giới từng phách đơn240; không tự suy ra blanket all-sixteenths-unbeamed |
| 6/8 eighths | Hai nhóm 3+3; không beam qua ranh giới hai phách phức | Không qua compound boundaries720; chi tiết secondary beam/rest/mixed examples chưa quy định cần notation review riêng |
| 9/8 eighths | Ba nhóm 3+3+3; không beam qua ranh giới ba phách phức | Không qua compound boundaries720/1440; chi tiết secondary beam/rest/mixed examples chưa quy định cần notation review riêng |
| 2/2 eighths | Contract trước đây giữ nguyên4+4 theo hai half pulses | Contract trước đây16 sixteenths: primary8+8, secondary4+4 \| 4+4; không thay Bonus placement |

Các nhóm 3 mô tả pattern eighth notes liên tục trong phách phức, không bắt buộc luôn có 3 sounding attacks ở một phách chứa rest hoặc duration khác. Sixteenths/rests/mixed patterns phải giữ ranh giới phách/phách phức. Tie tự nó không buộc beam break; beam hợp lệ không được vượt ranh giới approved chỉ vì có tie. Rest giữ duration và không trở thành onset; continuation không tạo attack; barlines/duration/parity giữ contract cũ. Những case chi tiết chưa quy định cần review riêng, không làm rule eighth notes trở lại PROPOSED.

## 6. Strict voice và VexFlow projection

Canonical rhythm ticks là authority; strict voice ticks trong notation library chỉ là lớp kiểm tra phụ để bảo đảm renderer không nhận voice thiếu hoặc thừa. Với `9/8`, renderer phải truyền đúng time signature với **numerator `9`, denominator `8`**; không suy ra hoặc hiển thị thành `3/8` chỉ vì cùng eighth grid.

Khi strict voice dùng whole-voice resolution `16384` ticks, bar voice ticks của `9/8` là:

```text
whole voice = 16384
9/8 voice bar = 16384 × 9/8 = 18432
canonical rhythm bar = 2160 ticks
```

`18432` là giá trị của voice-resolution layer và `2160` là canonical PPQ rhythm layer; hai giá trị phải được liên kết bằng Fraction calculation chính xác, không được thay thế cho nhau và không được so sánh như cùng một đơn vị. Các meter khác cũng phải đi qua cùng generic conversion/parity layers, không tạo một công thức riêng chỉ cho `9/8`.

Notation parity fixture tương lai phải đối chiếu tối thiểu:

1. ordered written durations;
2. canonical segment start/end ticks;
3. pulse index và subdivision index;
4. time signature numerator/denominator;
5. strict voice ticks;
6. beam groups và barline/rest boundaries;
7. tie roles và onset flags.

Nếu renderer thể hiện note ở vị trí khác canonical tick, tạo thêm onset cho tie continuation, hoặc biến rest thành attack, parity phải fail. Renderer không được tự sửa pattern để strict voice vừa bar; validator phải từ chối pattern sai trước khi projection.

## 7. Tương thích với duration, tie và các lớp dùng chung

Đặc tả này giữ nguyên các policy đã có và chỉ mở rộng meter matrix:

- duration descriptors, integer PPQ `480`, dot calculation và Fraction calculation vẫn là lớp dùng chung;
- tie semantics giữ nguyên: segment đầu tie group có attack, continuation không có attack, duration/gate vẫn kéo dài theo tick;
- whole exercise exact-fill, `+10` correct / `+0` wrong, onset-only tap, `currentTime` và matching windows không được thay đổi bởi meter matrix này;
- các lớp parity generic giữa canonical rhythm, notation projection và audio projection phải tiếp tục dùng chung, không nhân bản logic theo từng meter;
- explicit segment accent không được tự động sinh chỉ từ structural accent;
- không thêm tuplet, swing, mixed meter, polyrhythm hoặc một notation semantics mới.

`3/8`, `6/8`, `9/8` phải cùng thuộc một knowledge group **Grouping in Threes**, nhưng không được biến thành ba khóa học độc lập và cũng không được xóa identity nhạc lý của từng meter. `2/2` vẫn là Bonus có hỗ trợ V1, không được tính là meter core thứ bảy.

## 8. Đã APPROVED và các chi tiết còn pending

Beam eighth3/8 flag riêng, compound3+3/3+3+3; ba phương thức counting (voice tiếng Anh mặc định/visual số tự đếm ngôn ngữ tùy ý/tick); hai hình thức accent và optional color đã APPROVED. Không hỏi lại các quyết định này.

Còn pending: các ví dụ secondary sixteenth beams, rests và mixed-duration notation chưa được quy định chi tiết, luôn giữ ranh giới phách/phách phức; lựa chọn chi tiết voice assets và cách đọc các vị trí subdivision chưa được mô tả, không đổi English-default hoặc canonical coordinates; các strict-voice parity fixtures/release evidence tương lai và pilot không liên quan. Chưa cấp quyền sửa renderer/audio/UI hoặc triển khai runtime. Numerical gain/velocity không tự chốt từ màu hay hierarchy.

**Kết luận:** Đây là ma trận yêu cầu và notation contract cho bảy meter V1 được hỗ trợ: `2/4`, `3/4`, `4/4`, `3/8`, `6/8`, `9/8` và Bonus `2/2`. Tài liệu không tuyên bố rằng curriculum, renderer, generator, audio hoặc test hiện tại đã được cập nhật hay đã vượt qua kiểm thử.
