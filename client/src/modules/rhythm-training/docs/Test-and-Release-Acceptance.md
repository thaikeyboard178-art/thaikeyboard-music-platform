# Rhythm Training V1 — Test và Release Acceptance

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

**Trạng thái:** đề xuất nghiệm thu cho curriculum đã duyệt; chưa triển khai và chưa phải kết quả test.

**Phạm vi tài liệu:** tài liệu này chỉ ghi các test ID, expected value, tiêu chí migration và release gate cho Rhythm Training V1. Chỉ các Markdown được liệt kê trong change record được chỉnh; không có source code, test source, UI, audio, database, infrastructure, dependency, Note Reading, MIDI, microphone, Phase 3/4/5 hoặc deploy nào được thay đổi. Không chạy test hiện có trong nhiệm vụ documentation-only này.

**Repository context được bảo toàn:** `/home/ubuntu/notnhac`, repository `thaikeyboard178-art/thaikeyboard-music-platform`, branch `main`. Các hash/436-test results trong hồ sơ cũ chỉ là lịch sử; nhiệm vụ này chỉ commit/push Markdown sau consistency/hash checks, không triển khai runtime hoặc dùng kết quả lịch sử như fresh pass.

## 1. Quy ước đọc acceptance

Mỗi dòng có ID là một **yêu cầu kiểm thử tương lai**. “Expected” là giá trị cần đạt sau khi có phê duyệt triển khai; không được đọc thành bằng chứng rằng code hiện tại đã pass. Release chỉ được gọi là đạt khi các acceptance bắt buộc được chạy trên implementation đã được duyệt, kết quả được lưu lại, và các gate bên dưới được ký xác nhận.

V1 có **7 meter được hỗ trợ**: sáu meter core `2/4`, `3/4`, `4/4`, `3/8`, `6/8`, `9/8`, cộng **Bonus `2/2`**. Vì vậy không dùng cách đếm “sáu meter được hỗ trợ” để loại `9/8` hoặc `2/2`. Core completion không yêu cầu Bonus, nhưng `2/2` vẫn là supported feature của V1 và phải có acceptance riêng.

Code hiện tại vẫn được xem là có **8 legacy data-only levels và 4 legacy meters**; curriculum mới chưa được triển khai. Kết quả lịch sử `436/436 tests trên 40 files` không phải fresh result của bộ test mới, không chứng minh hỗ trợ bảy meter, và không được ghi là release pass.

## 2. Canonical PPQ và meter registry acceptance

Tất cả expected tick values dưới đây dùng `PPQ = 480`. Bar capacity, pulse duration, pulse starts, nhóm nhịp và BPM đều phải lấy từ cặp meter chính xác; không suy ra pulse chỉ từ numerator hoặc denominator.

| Meter | Type/ý nghĩa phải giữ | Bar capacity (ticks) | Pulse ticks / pulse unit | Pulse starts | Teaching accent string | Expected distinction |
|---|---|---:|---|---|---|---|
| `2/4` | Simple duple | `960` | `480` / quarter | `[0, 480]` | `Sw` | Hai phách chính, phách quarter |
| `3/4` | Simple triple | `1440` | `480` / quarter | `[0, 480, 960]` | `Sww` | Ba phách chính, không phải grouping compound |
| `4/4` | Simple quadruple | `1920` | `480` / quarter | `[0, 480, 960, 1440]` | `SwMw` hoặc tối thiểu `Swww` | Bốn phách quarter; medium accent nếu renderer có biểu diễn |
| `3/8` | **Simple triple**, một teaching group gồm ba eighth pulses | `720` | `240` / eighth | `[0, 240, 480]` | `Sww` | Ba pulse kỹ thuật độc lập; không được biến thành một pulse `720` và không được gán compound |
| `6/8` | Compound duple, hai dotted-quarter pulses | `1440` | `720` / dotted quarter | `[0, 720]` | `Sww\|Mww` | Hai phách phức, mỗi phách gồm 3 phách đơn; grouping toàn ô là3+3 |
| `9/8` | Compound triple, ba dotted-quarter pulses | `2160` | `720` / dotted quarter | `[0, 720, 1440]` | `Sww\|Mww\|Mww` | Ba pulse chính, nhóm `3+3+3` eighths |
| `2/2` Bonus | Alla breve, two half-note pulses | `1920` | `960` / half | `[0, 960]` | `Sw` | Hai phách chính theo half-note pulse, không đồng nhất ngữ nghĩa với `4/4` |

### 2.1 Schema và registry IDs

| Test ID | Acceptance | Expected value / failure condition |
|---|---|---|
| `AT-MTR-001` | Serialized meter schema chỉ nhận các cặp được duyệt | Accept đúng `2/4`, `3/4`, `4/4`, `3/8`, `6/8`, `9/8`, `2/2`; reject `3/2`, `6/4`, `5/8` và mọi cặp chưa được duyệt. |
| `AT-MTR-002` | Registry lookup exact-pair keyed | Mỗi cặp trả đúng capacity, pulseTicks, pulseUnit, pulseCount, pulseStarts, grouping và structural accents của bảng trên; không fallback sang meter khác. |
| `AT-MTR-003` | `3/8` simple-triple semantics | Expected `capacity=720`, `pulseTicks=240`, `pulseCount=3`, starts `[0,240,480]`, type `simple-triple`, accents `Sww`, teaching group count `1`. Không được trả `pulseTicks=720`, `pulseCount=1`, hoặc `compound`. |
| `AT-MTR-004` | `6/8` compound-duple semantics | Expected `capacity=1440`, `pulseTicks=720`, `pulseCount=2`, starts `[0,720]`, grouping `[3,3]`;2 phách phức, mỗi phách3 phách đơn; accents `S-M` tại cấp phách phức và `Sww\|Mww` tại eighth positions; không hỏi lại hierarchy. |
| `AT-MTR-005` | `9/8` compound-triple semantics | Expected `capacity=2160`, `pulseTicks=720`, `pulseCount=3`, starts `[0,720,1440]`, grouping `[3,3,3]`;3 phách phức, mỗi phách3 phách đơn; accents `S-M-M` và `Sww\|Mww\|Mww`; không gán Mạnh ngang nhau cho3 nhóm. |
| `AT-MTR-006` | `2/2` Bonus semantics | Expected `capacity=1920`, `pulseTicks=960`, `pulseCount=2`, starts `[0,960]`, pulse unit `half`, accents `Sw`; không dùng quarter-pulse metadata của `4/4`. |
| `AT-MTR-007` | BPM label follows felt pulse | `2/4`, `3/4`, `4/4`: quarter-note BPM; `3/8`: eighth-note BPM; `6/8`, `9/8`: dotted-quarter BPM; `2/2`: half-note BPM. Label không được chỉ hiện “BPM” không có pulse unit trong acceptance fixture. |
| `AT-MTR-008` | Seven-meter count is stable | Registry/coverage report phải liệt kê 6 core + 1 Bonus = 7 supported meters; không dùng assertion cũ “six supported meters” sau migration. |

### 2.1a Acceptance cho đính chính Level6 — chưa thực thi

| Test ID đề xuất | Expected |
|---|---|
| `AT-ACC-L6-001` | 3/8=3 phách đơn; accents `[S,w,w]` tại `[0,240,480]`; không compound beat720 |
| `AT-ACC-L6-002` | 6/8=2 phách phức,6 phách đơn; eighth vector `[S,w,w,M,w,w]`; compound vector `[S,M]` |
| `AT-ACC-L6-003` | 9/8=3 phách phức,9 phách đơn; eighth vector `[S,w,w,M,w,w,M,w,w]`; compound vector `[S,M,M]` |
| `AT-ACC-L6-004` | Reject semantic labels đồng nhất phách đơn/phách phức hoặc gán Mạnh ngang nhau đầu mọi nhóm |
| `AT-ACC-L6-005` | Accent không tạo attack ở rest/tie continuation hoặc đổi PPQ/pulse/tempo/scoring; UI/beam/counting không ghi đè nhạc lý |

Các ID trên chỉ là yêu cầu kiểm thử bằng tài liệu, không code/test mới, chưa chạy/chưa pass.

### 2.2 Tránh nhầm `3/8` giữa nhóm giảng dạy và nhịp học thuật

Expected acceptance cho `3/8` phải ghi đồng thời hai lớp thông tin:

1. **Teaching grouping:** một group gồm `3` eighths, giữ chuỗi hiển thị/trọng âm dạy học `Sww`.
2. **Relative metrical identity:** `3/8` là simple triple với `3` eighth pulses độc lập, mỗi pulse `240` ticks; không được xoá identity bằng cách gọi group count `1` là một technical pulse `720` ticks.

Nhãn nguồn cũ “3/8 phách chính1” là lịch sử bị thay thế.3/8 có 3 phách đơn;6/8 Mạnh–Vừa và9/8 Mạnh–Vừa–Vừa ở cấp phách phức. Semantics và ba quyết định presentation mới đều APPROVED; acceptance phải áp dụng đúng flag riêng3/8, beam compound boundaries, ba counting methods và hai accent forms, không hỏi lại approval.

## 3. Tick, duration, BPM và coordinate acceptance

Công thức canonical là:

```text
seconds = (ticks / pulseTicks) * (60 / pulseBPM)
```

Tick coordinates phải được derive từ ordered duration descriptors. Không cho phép một beat-position field editable độc lập làm lệch khỏi duration sum.

| Test ID | Fixture | Expected result |
|---|---|---|
| `AT-TIM-001` | Duration conversion ở `PPQ=480` | quarter `480`, half `960`, whole `1920`, eighth `240`, sixteenth `120`, dotted quarter `720`, dotted half `1440`; integer-only arithmetic. |
| `AT-TIM-002` | 3/8 eighth-pulse tempo | Ở `60 eighth-pulse BPM`, mỗi eighth/pulse `240` ticks = `1 sec`, bar `720` = `3 sec`; ở `120`, bar = `1.5 sec`. Không dùng dotted-quarter BPM cho `3/8`. |
| `AT-TIM-003` | 9/8 bar tempo | Ở `60 dotted-quarter BPM`, mỗi `720`-tick pulse = `1 sec`, full bar `2160` = `3 sec`; ở `120`, full bar = `1.5 sec`. |
| `AT-TIM-004` | 9/8 eighth duration | Mỗi eighth `240` ticks ở `60 dotted-quarter BPM` = `1/3 sec`; chín eighths trong bar lần lượt chiếm ba nhóm pulse, không phải chín quarter-like beats. |
| `AT-TIM-005` | 6/8 tempo | Ở `60 dotted-quarter BPM`, mỗi pulse `720` = `1 sec`, full bar `1440` = `2 sec`; subdivisions vẫn là `240` ticks. |
| `AT-TIM-006` | 2/2 tempo | Ở `60 half-note BPM`, mỗi half pulse `960` = `1 sec`, full bar `1920` = `2 sec`; ở `120`, full bar = `1 sec`. |
| `AT-TIM-007` | Simple-meter tempo | Với `2/4`, `3/4`, `4/4`, quarter pulse `480` phải dùng quarter-note BPM và giữ các capacity lần lượt `960`, `1440`, `1920`. |
| `AT-COORD-001` | 3/8 continuous eighths | starts `[0,240,480]`; `pulseIndex=[0,1,2]`; eighth-grid `subdivisionIndex=[0,0,0]` vì mỗi eighth là một pulse. |
| `AT-COORD-002` | 6/8 six continuous eighths | starts `[0,240,480,720,960,1200]`; `pulseIndex=[0,0,0,1,1,1]`; local subdivision `[0,1,2,0,1,2]`. |
| `AT-COORD-003` | 9/8 nine continuous eighths | starts `[0,240,480,720,960,1200,1440,1680,1920]`; `pulseIndex=[0,0,0,1,1,1,2,2,2]`; local eighth `subdivisionIndex=[0,1,2,0,1,2,0,1,2]`. |
| `AT-COORD-004` | 9/8 group starts | Technical pulse starts exactly `[0,720,1440]`; the first eighth in each group has local subdivision `0`, and the coordinate view must not flatten the groups into a single 0..8 pulse index. |
| `AT-COORD-005` | 2/2 quarter grid | starts `[0,480,960,1440]`; `pulseIndex=[0,0,1,1]`; local quarter subdivision `[0,1,0,1]`. |
| `AT-COORD-006` | 2/2 eighth grid | starts `0..1680` step `240`; four eighths per half pulse; local indices `[0,1,2,3,0,1,2,3]`. |
| `AT-COORD-007` | Derived-view authority | Any imported cached start/end/pulse/subdivision values that disagree with ordered durations are rejected; validator never chooses the cached value merely because it fills the bar. |

## 4. Bar capacity, rests, attacks và ties

Rest có duration đầy đủ nhưng không có onset. Tied continuation không tạo attack thứ hai. Những rule này áp dụng cho cả meter cũ và meter mới, không bị thay đổi bởi teaching grouping.

| Test ID | Fixture | Expected result |
|---|---|---|
| `AT-BAR-001` | Valid 3/8: three eighth notes | Sum `240+240+240=720`; accepts; attacks at `0,240,480`. |
| `AT-BAR-002` | Valid 9/8: nine eighth notes | Sum `9*240=2160`; accepts; nine attack starts as in `AT-COORD-003`. |
| `AT-BAR-003` | Valid 9/8 all rests | Nine eighth rests sum `2160`; accepts as canonical notation/validator material; all `onsets=[]`, all segments have `kind=rest`. |
| `AT-BAR-004` | 9/8 underfill | Seven eighths sum `1680` and must reject. A 9/8 fixture with total `1920` is also underfilled and must reject. |
| `AT-BAR-005` | 9/8 overfill | Eight eighths plus one quarter (`1920+?` as authored) or any total `2400` must reject; specifically a fixture totaling `2400` is overfilled. Do not coerce to 9/8. |
| `AT-BAR-006` | 3/8 under/overfill | Two eighths total `480` rejects; four eighths total `960` rejects. |
| `AT-BAR-007` | Existing exact-fill meters | Preserve valid/invalid capacity behavior for `2/4=960`, `3/4=1440`, `4/4=1920`, `6/8=1440`, and `2/2=1920`. |
| `AT-REST-001` | Rests in mixed pattern | Rest consumes its descriptor ticks and emits no onset; a rest at a pulse/group start is not an attack target. |
| `AT-REST-002` | All-rest zero-onset fixture | Validator and notation may accept all-rest bars, including 9/8; generated graded Tap items retain the explicit policy that a zero-target item is not graded rather than silently inventing a target. |
| `AT-TIE-001` | Adjacent same-group note tie | First segment attacks; continuation has `onset=false`; one sustained gate spans the tie group. |
| `AT-TIE-002` | Cross-bar tie | Adjacent final segment of one bar and first segment of next may share a tie group; continuation has no second attack and total gate follows exact ticks. |
| `AT-TIE-003` | Tie through rest | Reject tie members separated by a rest, non-adjacent tie members, tie to rest, mismatched tie identity, or a second attack on a continuation. |
| `AT-TIE-004` | 3/8 and 9/8 tie coordinates | Tie semantics remain tick-based across the `240`-eighth and `720`-dotted-quarter pulse overlays; group teaching does not create extra attack targets. |
| `AT-TIE-005` | Dotted and tie interaction | Dotted duration is exact; Level 4 supports dots/ties while dotted eighth remains deferred until Level 5 sixteenth-grid policy. Reject malformed dots and contradictory cached ticks. |

## 5. Curriculum, level policy và migration acceptance

Curriculum chính thức không được suy ra từ legacy eight-level count. Mỗi Level và Bonus phải có đủ **Lessons, Practice, Assessment**. Level 6 là một knowledge group thống nhất, không tách thành ba course độc lập.

| Test ID | Curriculum contract | Expected acceptance |
|---|---|---|
| `AT-CUR-001` | Level 1 | Lessons/Practice/Assessment cover black/quarter, half, whole notes and **quarter rests only**. Không thêm eighth vocabulary vào Level 1 acceptance. |
| `AT-CUR-002` | Level 2 | Lessons/Practice/Assessment cover eighth notes, eighth rests, and binary subdivision of a quarter in a formal 4/4 scaffold; formal 2/4 and 3/4 coverage is deferred to Level 3. |
| `AT-CUR-003` | Level 3 | Lessons/Practice/Assessment cover one Simple Meter group: `2/4`, `3/4`, `4/4`; identify signature, count beats, understand accent, distinguish bar capacity, analyze/practice patterns. |
| `AT-CUR-004` | Level 4 | Lessons/Practice/Assessment cover dots and ties. Dotted eighth is deferred until Level 5 sixteenth-grid policy; no acceptance fixture may silently advance it into Level 4. |
| `AT-CUR-005` | Level 5 | Lessons/Practice/Assessment cover sixteenths, combinations, advanced rhythms, and controlled consolidation of retained old Level 7/8 outcomes. This is not permission to create new Level 7/8. |
| `AT-CUR-006` | Level 6 single group | One unified `Grouping in Threes` knowledge group contains `3/8`, `6/8`, `9/8`; catalog/content must not expose three independent courses. |
| `AT-CUR-007` | Level 6 progression step 1 | Lessons introduce recognition of one group of three eighths; Practice and Assessment contain a corresponding one-group concept before expansion. |
| `AT-CUR-008` | Level 6 progression step 2 | Content expands to two groups; expected identity is `6/8`, with `3+3` grouping and `Sww\|Mww` teaching accent, without losing meter identity. |
| `AT-CUR-009` | Level 6 progression step 3 | Content expands to three groups; expected identity is `9/8`, with `3+3+3` grouping and `Sww\|Mww\|Mww`. |
| `AT-CUR-010` | Level 6 progression step 4 | Lessons/Practice/Assessment compare group counts and accent positions across all three signatures. The comparison must distinguish `3/8` three simple pulses from `6/8` two compound pulses and `9/8` three compound pulses. |
| `AT-CUR-011` | Level 6 progression step 5 | Content analyzes notes, rests, dots and ties in all three signatures; rests consume duration, ties suppress continuation attacks, and dots remain exact tick values. |
| `AT-CUR-012` | Level 6 progression step 6 | Combined Practice and Assessment cover all `3/8`, `6/8`, `9/8` in one unified group, with meter-labeled pulse semantics and no cross-meter fallback. |
| `AT-CUR-013` | Bonus structure | Bonus `2/2` has its own Lessons, Practice and Assessment: half-note pulse, two pulses, `Sw`, `capacity=1920`, `pulseTicks=960`, starts `[0,960]`, and comparison with `4/4`. |
| `AT-CUR-014` | Completion policy | Core completion excludes Bonus `2/2`; release V1 still supports Bonus content and tests. Bonus omission from a core progression report must not mean unsupported meter. |
| `AT-CUR-015` | Existing outcome migration | Preserve valid old outcomes such as duration, exact fill, rests, ties, onset-only tap semantics, scoring and exercise-kind boundaries. Migrate brittle literal “8 levels” assertions to the approved seven-part structure (six core meter curriculum levels plus Bonus feature where applicable); do not retain obsolete level-count assertions solely because legacy data exists. |
| `AT-CUR-016` | Generator level policy | Generator fixtures expose level capabilities explicitly: allowed meters, duration vocabulary, rest policy, dots/ties, sixteenth grid, difficulty sources and exercise kinds. They reject concepts not enabled by the selected level instead of selecting by old numeric level assumptions. |

### 5.1 Level 6 semantic acceptance table

| Signature | Teaching group count | Technical pulse count | Technical pulse unit | Teaching string | Required interpretation |
|---|---:|---:|---|---|---|
| `3/8` | `1` | `3` | eighth `240` | `Sww` | Simple triple: three independent eighth pulses. “Group count 1” is not “one technical pulse.” |
| `6/8` | `2` | `2` | dotted quarter `720` | `Sww\|Mww` | Compound duple: two main pulses, each internally `3` eighths. |
| `9/8` | `3` | `3` | dotted quarter `720` | `Sww\|Mww\|Mww` | Compound triple: three main pulses, each internally `3` eighths. |

Owner-confirmed convention:3/8 `Sww`,6/8 `Sww|Mww`,9/8 `Sww|Mww|Mww`; compound-beat vectors `S-M`,`S-M-M`. Proposed acceptance must reject all-group-strong or compound3/8 interpretations. Numeric gain and UI encoding are not implementation claims and may not change canonical coordinates.

## 6. Generator, answer, distractor và notation acceptance

| Test ID | Area | Expected value / failure condition |
|---|---|---|
| `AT-GEN-001` | Determinism | Same seed, same meter, same curriculum capability and same generator policy version produce the same canonical exercise. If default pools expand, either preserve a legacy policy version or document changed default outputs; do not claim old seed identity automatically. |
| `AT-GEN-002` | Exact meter preservation | Requested meter remains the requested exact pair. No fallback from `9/8` to `6/8`, `3/8` to `6/8`, `2/2` to `4/4`, or denominator-based coercion merely to fill a choice set. |
| `AT-GEN-003` | Exact capacity | Every generated measure equals its registry capacity. Underfilled, overfilled, zero/negative, unsupported dots, unsupported tuplets/swing/mixed meter/polyrhythm are rejected before reaching an exercise mode. |
| `AT-GEN-004` | Level vocabulary | Generator does not emit dotted eighth before Level 5 sixteenth-grid policy; does not emit sixteenths in earlier levels; does not emit 2/2 in core progression unless Bonus/approved transfer capability is selected. |
| `AT-GEN-005` | Rests and ties | Generated rests consume duration and have no onset; tied continuations are adjacent, valid and attack-free. Invalid tie adjacency never reaches notation, audio or answer validation. |
| `AT-GEN-006` | Difficulty budget | Level 5 and Level 6 combined patterns introduce only approved interactions; controlled consolidation of old Level 7/8 outcomes stays within Level 5 policy and does not create new levels. |
| `AT-DST-001` | Canonical-equivalent distractors | Reject distractors with the same canonical answer signature, same onset/duration/tie/rest answer, or same target property under the requested exercise kind. |
| `AT-DST-002` | Visual equivalence | Reject distractors visually indistinguishable for the task, including equivalent notation/beam forms when the question asks for that visual distinction. Do not rely on labels alone. |
| `AT-DST-003` | Audio equivalence | For Listen & Identify, reject distractors that are audibly indistinguishable under the intended duration-aware route; duration/tie/rest differences must not be erased by click-only audio. |
| `AT-DST-004` | No cross-meter filler | Choice generation must not use another meter as an equivalent filler solely to reach a choice count. Meter label and canonical signature remain distinct. |
| `AT-NOT-001` | Derived timeline parity | Notation event positions equal canonical derived starts/ends; strict voice/tick checks are secondary assertions, not the authority over canonical duration arithmetic. |
| `AT-NOT-002` | 3/8 eighth flags APPROVED | Ba móc đơn liên tục có 3 flag riêng và không có beam nối ba nốt; giữ pulseIndex `[0,1,2]`, pulseTicks240, Sww, tempo và Count the Beat coordinates. Không optional bar-wide beam/teacher reconfirmation. |
| `AT-NOT-003` | Compound eighth beams APPROVED |6/8 nhóm 3+3 không qua boundary720;9/8 nhóm 3+3+3 không qua720/1440; không nối across compound beats. Pulse metadata/canonical durations không đổi. |
| `AT-NOT-004` | 2/2 notation | `2/2` displays half-pulse semantics; eighth beams may use `4+4` within the two half pulses. It must not be rendered as an unlabeled `4/4` equivalent. |
| `AT-NOT-005` | Rests, ties và mixed notation | Rests giữduration/khôngonset, tie continuation khôngattack; sixteenth/rest/mixed-duration notation phù hợp và không mất ranh giới phách/phách phức; không tự áp rule group3 cho mọi sounding event. Canonical/notation/audio projection tương lai phải parity. |
| `AT-NOT-006` | Structural accent / presentation / schema separation | Strong=Mạnh, Medium=Vừa, Weak=Nhẹ; approved text hoặc symbol forms không tự đổi segment.accent binary, technical pulse/subdivision/hierarchy hoặc explicit note articulation. |

## 6a. Presentation acceptance — APPROVED requirements, chưa thực thi

Đây là acceptance criteria đã đồng bộ theo chủ sản phẩm, không phải code/test cases đã triển khai hoặc kết quả chạy. Những test dưới đây phải được thực thi sau approval implementation riêng.

| Test ID | Phạm vi | Expected / rejection condition |
|---|---|---|
| `AT-PRES-BEAM-001` | 3/8 — flag móc đơn riêng | Ba móc đơn liên tục có 3 flag riêng, không beam nối ba nốt. Ba phách đơn 240 ticks tại 0/240/480 giữ nguyên. |
| `AT-PRES-BEAM-002` | 6/8 — compound grouping | Sáu móc đơn liên tục có hai beam groups 3+3; không beam qua ranh giới 720 ticks. Hai phách phức 720 ticks giữ nguyên. |
| `AT-PRES-BEAM-003` | 9/8 — compound grouping | Chín móc đơn liên tục có ba beam groups 3+3+3; không beam qua ranh giới 720/1440 ticks. Ba phách phức 720 ticks giữ nguyên. |
| `AT-PRES-BEAM-004` | Sixteenth/rest/mixed patterns | Notation rules phù hợp phải giữ ranh giới phách/phách phức; rest và tie continuation không tạo attack. Không tự chốt secondary-beam cases chưa quy định hoặc biến 3/8 thành compound. |
| `AT-PRES-COUNT-001` | App Voice Counting | App đọc số bằng tiếng Anh mặc định: One, Two, Three...; không đặt Vietnamese-first voice hoặc syllable tiếng Việt bắt buộc làm default. Đây là yêu cầu tương lai, không phải audio test pass. |
| `AT-PRES-COUNT-002` | Visual Counting | Hiển thị con số tương ứng canonical counting positions. Người học tự đếm bằng ngôn ngữ muốn, không bắt buộc tiếng Anh; không lấy voice locale làm ràng buộc ngôn ngữ tự đếm. |
| `AT-PRES-COUNT-003` | Metronome | Âm tick, tick, tick... theo contract metronome hiện có; không cần đọc số/syllable. Không tự gộp metronome với voice counting hoặc thay technical pulse/subdivision. |
| `AT-PRES-COUNT-004` | Tách ngôn ngữ và phương thức | Numeric display không đồng nhất với automatic pronunciation. English-default app voice không ép người học đếm tiếng Anh hoặc đổi Vietnamese-first UI. Ba presentation methods không tạo exercise/shared-session modes mới. |
| `AT-PRES-ACC-001` | Text-based dùng độc lập | Dùng Mạnh–Vừa–Nhẹ hoặc Mạnh–Nhẹ–Nhẹ tùy meter; font weight/độ đậm/group boundary là tùy chọn. Không reject text-based vì thiếu ký hiệu hoặc màu. |
| `AT-PRES-ACC-002` | Symbol-based dùng độc lập | Được dùng gạch nối, gạch dưới hoặc đồ họa; được dùng màu để phân biệt cấp trọng âm. Không reject symbol-based vì không có chữ trọng âm hoặc không dùng màu. |
| `AT-PRES-ACC-003` | Không bắt buộc phối hợp | Không bắt buộc chữ + ký hiệu + màu đồng thời; không áp blanket ban color-only trái quyết định. Điều kiện tương phản/khả năng nhận biết vẫn áp dụng nếu dùng màu. |
| `AT-PRES-ACC-004` | Điều kiện nếu sử dụng màu | Nếu dùng màu, cần đủ độ tương phản và khả năng nhận biết cấp trọng âm. Đánh giá cấu hình màu thực tế sau implementation approval; không tự nhận device pass hoặc đặt numeric threshold chưa được quy định. |
| `AT-PRES-ACC-005` | Hierarchy/schema giữ nguyên | Strong=Mạnh, Medium=Vừa, Weak=Nhẹ. Các vector 3/8 Sww, 6/8 Sww\|Mww, 9/8 Sww\|Mww\|Mww giữ nguyên; không đổi segment.accent, technical pulse, subdivision hoặc curriculum placement. |
| `AT-PRES-BOUNDARY-001` | Approval tài liệu không phải runtime | APPROVED presentation không kích hoạt UI hoặc cho phép sửa VexFlow/audio/source/test/shared architecture/database. Các acceptance ID mới chưa triển khai, chưa chạy, chưa pass. |

## 7. Exercise-kind and scoring acceptance boundary

These are retained technical contracts, not claims that UI or audio currently works.

| Test ID | Contract | Expected value |
|---|---|---|
| `AT-EX-001` | Four local exercise kinds | Keep `Multiple Choice`, `Tap Rhythm`, `Listen & Identify`, `Count the Beat`; they remain local exercise kinds, not new shared session modes. |
| `AT-EX-002` | Whole-exercise scoring | One completed graded exercise submits exactly one shared answer: `+10` correct or `+0` wrong. No per-tap, per-cell, per-note or partial shared score. |
| `AT-EX-003` | Tap semantics | Tap validation is onset-only. It does not claim to measure hold duration; rests and tie continuations create no tap target. |
| `AT-EX-004` | Abort/no penalty | Hidden tab, pointer cancellation/loss, blur, context interruption, output-route change, tempo change during an active attempt, scheduler starvation or insufficient technical confidence aborts/ungrades without wrong score. |
| `AT-EX-005` | Retry/replay | Replay and unscored retry do not rescore; a technical abort does not submit a wrong answer. |
| `AT-EX-006` | Audio and notation parity | Future audio gates/attacks, where implemented, derive from the same canonical timeline; rest is silent, tie continuation has no attack, and duration gate ends at exact written/tie-group end. |

## 8. Release gates và future-phase boundaries

### Gate A — Documentation and contract review

- Curriculum review confirms Levels 1–6 and Bonus order exactly as approved.
- Level 6 is one unified `Grouping in Threes` group with the six-step progression and all three signatures.
- The seven-meter registry table, pulse BPM labels, `3/8` simple-triple distinction, and `2/2` Bonus contract are present.
- Record the closed owner decision:3/8 has3 simple eighth beats, not1 compound beat;6/8/9/8 use medium secondary compound-beat accents. No repeated teacher confirmation for these semantics.
- Record the three APPROVED presentation decisions;no fresh runtime pass is implied.
- No source/test implementation or active UI route is implied by this document.

### Gate B — Future canonical model, generator và notation implementation

After separate implementation approval, `AT-MTR-*`, `AT-TIM-*`, `AT-COORD-*`, `AT-BAR-*`, `AT-REST-*`, `AT-TIE-*`, `AT-CUR-*`, `AT-GEN-*`, `AT-DST-*`, `AT-NOT-*` and applicable `AT-PRES-*` notation/schema criteria must be run as applicable; counting/audio/UI criteria belong to their separately approved future phases. Acceptance requires exact values, valid/invalid bars, level policy, migration of brittle legacy assertions, semantic distractor filtering and notation parity.

The existing duration/PPQ/tie/whole-exercise scoring rules, `+10/+0`, onset-only tap semantics, current-time and confidence handling, matching windows, four local exercise kinds, Free/Challenge wrappers and boundary behavior remain unchanged unless a separately approved contract says otherwise.

### Gate C — Future Phase 3/4/5 checks remain unchanged

This document does **not** start or claim completion of:

- **Phase 3:** Web Audio scheduler, count-in, metronome, current-time mapping, calibration, cancellation, starvation detection or device timing fairness.
- **Phase 4:** four exercise implementations, local state machine, tap capture, duration-aware listening and interaction acceptance.
- **Phase 5:** shell integration, active route, UI/accessibility, responsive screens, Vietnamese copy implementation or result detail.

When those phases are later approved, their existing technical gates remain required. No UI test is claimed passing. No audio test is claimed passing. Bluetooth, hidden-tab, autoplay, interruption, orientation and device-latency behavior remain future browser/device acceptance work; technically unreliable attempts must be ungraded/no-penalty rather than learner-wrong.

### Gate D — Project checks and activation

Only after approved implementation and all prior gates may the project checks be run: `pnpm check`, `pnpm test`, `pnpm build:static`, and `pnpm build`, followed by the browser/device matrix and curriculum/content review. This documentation task does not run them. The historical `436/436` result remains historical context only.

Only after Gate D may the normal catalog/static-manifest activation be considered. Until then Rhythm Training remains Coming Soon/inert. No deploy, WordPress change, database change, source activation, audio activation, microphone, MIDI or production release is part of this update.

## 9. Quyết định đã đóng và chi tiết thực sự còn pending

Beam eighth3/8 riêngflag/compound3+3 và3+3+3;ba counting methods;hai accent forms/optionalcolor đều APPROVED. Không hỏi lại beam eighth, Vietnamese-first voice hoặc mandatory text/symbol/color combination.

Còn pending: ví dụ secondary sixteenth/rest/mixed-duration notation cụ thể chưa quy định (giữ boundaries); lựa chọn voice assets/chi tiết đọc subdivision chưa mô tả (English-default và visual tựđếm giữ nguyên); pilot/confidence/matching/readiness parameters, tempo/density/quota; cách hiển thị optional Bonus2/2 và legacy seed/version policy. Các chi tiết này không cấp runtime approval hoặc thay placement, hierarchy, pulse/schema.

## 10. Exact written path and change record

**Written path:** `/home/ubuntu/notnhac/client/src/modules/rhythm-training/docs/Test-and-Release-Acceptance.md`

**Changes in this documentation-only update:** created this acceptance document with proposed IDs and expected values for seven-meter schema/registry, meter type, pulse BPM, tick/seconds conversion, coordinates, bar capacity, rests, ties, generator level policy, distractors, notation, curriculum structure, legacy-test migration, release gates and future-phase boundaries. Historical change record retained;this update modifies Markdown acceptance only and may commit/push after consistency/hash verification, without runtime implementation.

**Not changed:** no source/test/TS/TSX/JS/CSS/JSON/DB/infrastructure/dependency/shared architecture/Note Reading files; no UI/catalog/audio/metronome/MIDI/microphone/Phase 3/4/5/deploy; no parent-owned TODO/README/plan. The assigned Markdown documents are the intended documentation changes. No existing tests were run because this task is documentation-only.
