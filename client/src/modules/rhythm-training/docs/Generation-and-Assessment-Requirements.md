# Rhythm Training V1 — Generation and Assessment Requirements


## Latest owner-approved generation and assessment policy — 2026-11-12 (APPROVED)

This latest policy supersedes conflicting curriculum placements and point/retry/flow summaries below, including earlier dated active-policy blocks. Preserve prior matching/technical approvals; the Tap per-question award is updated here only, while other callers retain +10/+0.

| Curriculum unit | Approved mapping |
|---|---|
| Level 1 | Basic notes and rests |
| Level 2 | Eighth notes/rests and binary subdivision |
| Level 3 | Merge the former simple-meter content with dotted notes, ties, and mixed durations |
| Level 4 | Sixteenth notes and subdivision |
| Level 5 | Controlled complex combinations of the learned rhythmic material |
| Level 6 | 3/8, 6/8, and 9/8 |
| Optional Bonus | 2/2; unchanged and optional |

No quota, count, or allocation is changed by this approval. Preserve every existing approved quota as-is; where a quota remains unapproved, retain that status rather than inventing or reclassifying one.

Keep every existing approved quota and its status unchanged. Generation for 6/8 must fill two independent 3-eighth groups of exactly 720 ticks each; 9/8 must fill three independent groups of exactly 720 ticks each. Each individual note, rest, or tie component is wholly contained within one group; a tie can sustain across a boundary only through valid adjacent note components, each wholly in its own group. Validate exact per-group and per-bar totals before publishing an exercise. Preserve serialized meter schema and canonical duration/pulse math. For all X/8, the eighth (240 ticks) is the technical pulse for BPM/counting (3/6/9 per bar); retain existing grouping, accents, beams, and defaults.

Separate the Tap/Quiz chooser from setup. Quiz is visual-only with no audio; every new run randomly selects eligible questions by unique stable `questionID`, never repeats IDs within a run, and never adds duplicate filler questions. Display four real answer options A–D, each mapped to canonical `optionID`; grading follows option identity, not label/position. If the eligible unique pool is short, do not duplicate to satisfy quota; leave approved quota status unchanged and follow existing shortfall behavior.

Tap BPM is 30–300 and changeable only when idle before Play; lock during countdown, collection, and drain. Retiming must preserve the same canonical written exercise and protected Timing Accuracy. Mode locks after setup; post-grade retry/replay is idle practice-only and cannot submit/score again. Graded completed Tap earns `roundHalfUp(10 × TimingAccuracyPercent / 100)` integer 0–10, separate from Formula B, in one non-persistent cumulative in-memory Tap session across continue/skip, reset only for a new run. Confirmed graded Skip deducts 5 once, clamped at 0, is not an answer or technical abort, and produces no award for that question; Practice/replay Skip has no penalty. Technical abort is neither answer nor Skip; Practice/replay, skip, abort, and no-accuracy earn no positive points. Other callers, Quiz, and Note Reading retain `+10/+0`; no shadow balance/session system; Chord Recognition unchanged.

Prior Phase 1–5 and Phase 4A.2 approvals remain intact, including all primary/supplemental matching and timing thresholds, clocks, capture, collection/drain, markers and Formula B. Do not edit matching policy or thresholds. These are not implementation/test-pass claims; human browser/device/headphone listening has not been performed.

## Owner-approved active-policy supersession — 2026-11-12

**APPROVED; active policy.** This supersedes only conflicting product-flow/curriculum-placement, Tap scoring/matching, retry, and pending-policy statements below. This long requirements document remains a historical proposal where it conflicts; unrelated duration, PPQ, meter identity, notation/grouping/accent, and validated-data guardrails are not rewritten.

The only learner-facing activities are **Tap Rhythm** and an independent **visual-only Rhythm Quiz**. Quiz requires neither audio nor tapping. No Lesson, Listen & Identify, or Count the Beat learner flow is developed. Tap is available at Levels 1–6 and Bonus 2/2 with fixed vocabulary: L1 quarter/half/whole notes and quarter rest; L2 eighth notes/rests and basic subdivision; L3 2/4, 3/4, 4/4; L4 dotted rhythms and ties; L5 sixteenth rhythms and complex combinations; L6 3/8, 6/8, 9/8; Bonus 2/2. Do not move later vocabulary down-level.

Formula B is `100 × 2TP / (N + K)` (`TP` = primary pass pairs in `Wpass`; `N` = expected onsets; `K` = physical collection taps after software-duplicate removal, including physical extras; `N=0` is not applicable). Approved T2-B uses `α=.30`, `β=.40`, `Cpass=50 ms`, `Cassoc=80 ms`. The primary clock bridge is `AudioContext.getOutputTimestamp()` with no graded fallback for untrusted mapping. Collection is first expected onset minus `Wassoc(first)` through last expected onset plus `Wassoc(last)`; delayed handler delivery drains for at most 100 ms, accepting only original event timestamps inside the musical interval. The locked primary ordered one-to-one DP, technical-ungraded boundary, and strict shared scoring (`+10` only for all expected onsets matched within `Wpass` and no extras; otherwise `+0`) remain unchanged. After primary DP is locked, a deterministic ordered, bounded residual midpoint-cell association within the graded collection interval may pair residual far taps/onsets for Early/Late diagnostics only; never TP, no primary-pair reassignment. Idle Practice replay preserves configuration, the visible original mode, and original grade/result, requires a fresh Play, and any replay/retry is rehearsal only with no second shared answer or score.

Quiz question count/quota, assessment quota changes, readiness/pilot thresholds, and educational-effectiveness claims are **not approved**; existing quota status remains unchanged. See [the active owner decisions](./Tap-Rhythm-V1-Phase-4A.2-Owner-Decisions.md) and current pulse table in [Meter and Notation Requirements](./Meter-and-Notation-Requirements.md). This policy summary is not a test pass or a physical-audio validation claim.

> **Historical-reading note:** The pre-existing D-07, four-kind/Lesson flow, old Tap placement, pending Formula B/T2/clock/replay text, and implementation-phase/status claims below are preserved only as historical planning where they conflict with the policy above.

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

**Trạng thái:** tài liệu yêu cầu cho thiết kế tương lai; chưa phải runtime contract và chưa được triển khai.

Tài liệu này mô tả metadata logic cho Lessons, Practice và Assessment, cùng các quy tắc sinh dữ liệu và chẩn đoán. Đây là mô tả nội dung và chính sách để chờ duyệt, không phải yêu cầu tạo type, API, schema, file source, test mới hoặc thay đổi shared architecture ngay bây giờ.

Các contract duration, PPQ, tie, whole-exercise +10/+0, onset-only timestamp matching, technical confidence, bốn exercise kinds và abort/no-rescore boundaries được giữ nguyên. D-07 không chốt matching windows, Timing Accuracy formula, grades hoặc calibration; các giá trị từng đề xuất không phải ngưỡng chính thức. Bài học dùng dữ liệu đã được validate; generator tương lai không được làm suy yếu exact-fill validator hoặc biến một chẩn đoán cục bộ thành shared score.

## 1. Phạm vi và trạng thái hiện tại

Curriculum được duyệt gồm sáu Level và một Bonus. Mỗi đơn vị đều phải có đủ **Lessons**, **Practice** và **Assessment**. Bonus là nội dung tùy chọn trong progression, nhưng vẫn là feature được V1 hỗ trợ. Level 6 là một knowledge group thống nhất, không tạo ba level ID độc lập cho 3/8, 6/8 và 9/8.

Code generator vẫn dùng tám level policy legacy với bốn-meter curriculum; canonical-to-SVG runtime đã có seven-meter gate riêng. Chưa có Tap Rhythm, audio hoặc UI hoạt động. Curriculum mới, generator metadata mới và các assessment set dưới đây **chưa được triển khai**. Tài liệu này không đổi trạng thái đó và không biến bằng chứng lịch sử `436/436 tests` thành kết quả kiểm tra mới.

## 2. Quy tắc metadata logic

Metadata ở đây là khái niệm nội dung để generator, authoring và review cùng hiểu; không phải một runtime contract mới. Tên trường bên dưới chỉ là nhãn logic có thể được ánh xạ sau khi có phê duyệt triển khai.

| Nhóm metadata | Mục đích | Yêu cầu bắt buộc |
|---|---|---|
| Curriculum unit | Xác định `level-1` … `level-6` hoặc `bonus-2-2` | Có title, mục tiêu, prerequisite mềm, meter/duration vocabulary được phép và thứ tự lesson; không tạo level ID riêng cho từng meter của Level 6 |
| Lesson | Nội dung giảng dạy và worked examples | Có mục tiêu, khái niệm, ví dụ đã validate, lời giải thích count/accent và chỉ báo exercise kind nếu có; không graded, không cộng điểm |
| Practice set | Luyện tập có thể lặp lại | Có wrapper `Free` hoặc `Challenge`, cấu hình kind/meter/difficulty/feedback và policy retry; practice không được biến thành nhiều shared answers cho một item |
| Assessment set | Đánh giá có cấu hình | Có seed, policy version, phân bổ meter/kind/diagnostic và tiêu chí answer; mỗi exercise hoàn tất là đúng một whole answer, shared result chỉ là +10 hoặc +0 |
| Diagnostic profile | Phân tích cục bộ sau answer | Có thể phân loại concept, onset, duration, meter, rest, tie, dot, grouping hoặc accent; không thay đổi shared score và không thêm partial-credit engine |
| Generation policy | Tái lập và kiểm soát độ khó | Có allowed vocabulary, exact-fill policy, rest/dot/tie policy, choice policy, seed và policy version; cấu hình tương đương phải cho kết quả deterministic |

Metadata không được dùng để ngầm mở rộng runtime sang microphone, MIDI, audio scheduler, Note Reading, database, shared session mode mới hoặc một scoring contract mới.

## 3. Curriculum metadata theo Level và Bonus

**D-07 — APPROVED OWNER DECISION, 2026-11-11 lúc 14:14 +07:00 (HISTORICAL WHERE SUPERSEDED)**, theo *Rhythm Training V1 — Curriculum Decision Update*; xem [Decision Review](./Decision-Review.md). Its historical Tap-from-Level-3 placement, four-kind flow, and Level 1–2 no-Tap clause are superseded by the active policy above.

Bảng này là nguồn nội dung được duyệt cho generation/assessment. Các mục “không được” là guardrails, không phải lời mời triển khai trước khi có phê duyệt.

| Đơn vị | Nội dung và vocabulary | Meter/generation scope | Yêu cầu Lessons | Yêu cầu Practice | Yêu cầu Assessment | Exercise direction — D-07 |
|---|---|---|---|---|---|---|
| **Level 1 — Pulse và note values** | Nốt đen, nốt trắng, nốt tròn; **chỉ dấu lặng đen** | Quarter-note grid trong4/4 teaching scaffold; không eighth, dot, tie, sixteenth hoặc compound grouping | Worked examples về giá trị 1/2/4 quarter và dấu lặng đen; không chấm điểm | Khuyến nghị Free trước; Challenge vẫn chọn được và gợi ý xem ví dụ không tạo hard gate; dùng pattern đơn giản, không thêm rest value ngoài quarter rest | Kiểm tra nhận diện value/rest và exact fill; onset/duration diagnostics ở mức phù hợp; một exercise = một whole answer | Multiple Choice + Listen & Identify; no Tap |
| **Level 2 — Eighth subdivision** | Nốt móc đơn, dấu lặng đơn, chia đôi phách (binary quarter subdivision) | Formal meter scaffold dùng **4/4**; không đưa 2/4 hoặc 3/4 vào lesson sớm của Level 2; không dot, tie, sixteenth hoặc compound grouping | Worked examples quarter → hai eighth, gồm eighth rest; cho thấy rest vẫn chiếm duration | Free/Challenge với 4/4, quarter/eighth grid và binary subdivision; không đổi sang meter khác để lấp pool | Đánh giá nhận diện subdivision, onset và rest trong 4/4; choice pool phải cùng policy và exact-fill | Multiple Choice + Listen & Identify; no Tap |
| **Level 3 — Simple Meter** | Nhận diện, đếm phách, trọng âm, độ dài ô nhịp và pattern trong **2/4, 3/4, 4/4** | Ba meter là cùng một knowledge group simple meter; pulse = quarter; không 3/8, 6/8, 9/8 hoặc 2/2 | Có lesson rõ ràng cho từng pair/contrast của 2/4, 3/4, 4/4 nhưng không tách thành ba Level ID | Free/Challenge chuyển có kiểm soát giữa ba meter; meter label luôn hiển thị trong answer/feedback | Cân bằng coverage 2/4, 3/4, 4/4; chẩn đoán meter, pulse, onset, duration và rest; không coi bar capacity giống nhau nếu semantics khác | Introduce Tap Rhythm in 2/4,3/4,4/4 |
| **Level 4 — Dots và ties** | Dấu chấm, nối trường độ, tie continuation không tạo attack mới | Chỉ simple meters2/4,3/4,4/4 đã học; không transfer sang3/8 hoặc2/2; dotted half/quarter được phép, dotted eighth hoãn đến sixteenth gridLevel5; giữ canonical duration arithmetic và tie rules | Worked examples tách dot và tie, sau đó examples kết hợp có kiểm soát; giải thích written duration và attack count | Free/Challenge với quarter/half/eighth theo vocabulary đã phê duyệt, dots/ties từng nguồn một trước khi kết hợp; không compound | Đánh giá duration, tie role, rest và onset; feedback phải phân biệt tied continuation với onset mới; một whole answer | Tap Rhythm + Multiple Choice |
| **Level 5 — Sixteenths và controlled consolidation** | Nốt móc kép, tổ hợp tiết tấu, tiết tấu nâng cao; consolidation có kiểm soát của nội dung old L7/L8 | Fine-grid và advanced patterns trong simple meters; dùng pulse-relative budget; không tạo Level 7/8 mới và không tự mở rộng sang 3/8/6/8/9/8/2/2 | Worked examples sixteenth grid, combinations, rest/dot/tie và advanced simple patterns theo từng difficulty source; không đưa nhiều nguồn mới cùng lúc | Free/Challenge tăng dần sixteenth density và controlled combinations; old L7/L8 chỉ được gom lại như nội dung consolidation có kiểm soát | Cân bằng onset, duration, meter và advanced-pattern diagnostics; rejection nếu pattern vượt capability hoặc làm mất identity của simple meter | Advanced Tap Rhythm |
| **Level 6 — Grouping in Threes** | Một knowledge group thống nhất về nhóm ba móc đơn: **3/8, 6/8, 9/8** | Không tạo ba course/level độc lập; generation phải giữ distinct meter identity, pulse unit, group count và accent model | Phải đi đúng progression ở mục 4; examples dùng note, rest, dot, tie theo capability đã mở; không dạy 3/8 như compound | Free/Challenge có thể so sánh ba meter trong cùng lesson, nhưng không được nới choice-pool guard; grouping overlay không xóa identity từng meter | Assessment tổng hợp cả ba signature; bắt buộc compare group counts, pulse units và owner-confirmed accent model, nhưng không được coi 3/8 là compound | Tap Rhythm with simple/compound pulses in one unit |
| **Bonus — 2/2 / Alla breve** | Half-note pulse, hai phách chính, phân biệt 2/2 với 4/4 | Optional progression; bar `1920`, pulse `960`, starts `[0, 960]`, accent `S-W`; không biến Bonus thành core Level | Lesson độc lập về half pulse và comparison với 4/4; nội dung tùy chọn nhưng feature phải được V1 hỗ trợ | Free/Challenge tùy learner progression; không bắt buộc hoàn thành để mở core curriculum | Assessment optional, có thể kiểm tra half-pulse identity, duration và 2/2-vs-4/4; vẫn one whole answer +10/+0 | Optional 2/2 Tap Rhythm progression |

### 3.1. Phạm vi meter và PPQ chuẩn — historical technical-pulse wording superseded

> In the retained table, 6/8 and 9/8 dotted-quarter pulse values are historical technical-timing wording only. Active technical pulses for all X/8 meters are eighth=240 ticks, with 3/6/9 pulses per bar; the musical 3+3 and 3+3+3 groups and accents remain unchanged.

PPQ chuẩn là `480`. V1 có **7 meter được hỗ trợ**: 6 core meters cộng Bonus, không phải sáu meter tổng cộng.

| Meter | Vai trò | Bar capacity | Pulse unit | Pulse ticks | Pulse starts | Teaching/structural identity |
|---|---|---:|---|---:|---|---|
| 2/4 | Level 3 | 960 | quarter | 480 | `[0, 480]` | simple duple, S-W |
| 3/4 | Level 3 | 1440 | quarter | 480 | `[0, 480, 960]` | simple triple, S-W-W |
| 4/4 | Level 1 scaffold, Level 2 scaffold, Level 3–5 | 1920 | quarter | 480 | `[0, 480, 960, 1440]` | simple quadruple, teaching accent theo policy hiện có |
| 3/8 | Level 6 | 720 | eighth | 240 | `[0, 240, 480]` | **simple triple**, `Sww`; ba eighth pulses độc lập |
| 6/8 | Level 6 | 1440 | dotted quarter | 720 | `[0, 720]` | compound duple, `Sww\|Mww`; hai nhóm 3+3 |
| 9/8 | Level 6 | 2160 | dotted quarter | 720 | `[0, 720, 1440]` | compound triple, `Sww\|Mww\|Mww`; ba nhóm 3+3+3 |
| 2/2 | Bonus | 1920 | half | 960 | `[0, 960]` | alla breve, `S-W` |

Trong Level6, quy ước chủ sản phẩm đã xác nhận:3/8 `Sww`;6/8 `Sww|Mww`;9/8 `Sww|Mww|Mww`. Bar-level accent là Mạnh đầu ô; secondary beat accent là Vừa đầu các phách phức sau; Nhẹ tại các phách đơn còn lại. Không dùng lại teaching strings cũ có Mạnh ở đầu mọi nhóm, không chia thành một overlay khác với hierarchy đã chốt. Không cần xác nhận lại semantics; UI accent forms/beam eighth/counting methods đã APPROVED theo Decision Review; không đổi generator code.

3/8 Simple Triple có 3 phách đơn móc đơn240 ticks độc lập, không có một phách phức.6/8 có 2 phách phức,9/8 có 3; mỗi phách phức là đen chấm dôi720 ticks gồm 3 phách đơn/subdivisions. Nhãn cũ “3/8 phách chính1” bị thay thế, không được dùng làm pulse count hoặc câu hỏi cần giáo viên xác nhận.

## 4. Progression bắt buộc của Level 6

Level 6 phải được author như một group thống nhất. Lesson, practice và assessment có thể sử dụng các signature khác nhau, nhưng không được tạo `level-6-3-8`, `level-6-6-8` và `level-6-9-8` như ba course độc lập.

| Bước | Mục tiêu logic | Điều phải giữ rõ |
|---:|---|---|
| 1 | Nhận diện **một group 3 eighths** | 3/8 là ba simple-triple pulses `240 + 240 + 240`; không gọi group đó là một compound pulse |
| 2 | Mở rộng thành **hai groups** | 6/8 là hai dotted-quarter pulses `720`, mỗi pulse chứa 3 eighths; giữ compound-duple identity |
| 3 | Mở rộng thành **ba groups** | 9/8 là ba dotted-quarter pulses `720`, giữ compound-triple identity |
| 4 | So sánh group count và vị trí accent | So sánh 1/2/3 groups và teaching strings, nhưng không làm mất meter identity |
| 5 | Phân tích notes, rests, dots và ties | Exact duration, attack và tie continuation dùng cùng canonical rules; rest không có onset |
| 6 | Combined practice và assessment cả ba signatures | Assessment phải kiểm tra cả 3/8, 6/8, 9/8; compare pulse units/group counts/accent model; 3/8 không bao giờ bị chấm như compound |

Lesson có thể đặt ba meter cạnh nhau để dạy comparison. Điều đó **không** nới quy tắc choice pool, không cho phép fallback sang meter khác và không cho phép một distractor bằng capacity nhưng khác identity được xem là equivalent.

## 5. Lessons, Practice và Assessment — historical learner-flow proposal where conflicting

> This section retains Lesson/Practice/Assessment and four-kind descriptions from the earlier design. These are not current learner flows where they conflict with the active Tap + visual Quiz policy above.

### 5.1. Lessons: worked examples, không grades

Lesson là nội dung giảng dạy, không submit shared answer hoặc cộng +10/+0. Worked examples tuân placement D-07: Level 1–2 dùng Multiple Choice/Listen & Identify; Tap illustration/practice chỉ bắt đầu Level 3. Không dùng nhãn ungraded để đưa Tap vào Level 1–2. Lesson phải hiển thị meter label, value/pulse explanation và kết quả exact-fill đã validate.

Lesson examples phải đi từ đơn giản đến kết hợp. Với dot/tie, nên tách nguồn khó trước khi kết hợp. Với Level 6, explanation phải đồng thời nêu group count, pulse unit và accent teaching model; không để hình thức beam hoặc cùng denominator quyết định meter semantics. Với 3/8, không dùng language làm learner hiểu rằng cả bar là một dotted-quarter pulse.

### 5.2. Practice: chỉ dùng Free và Challenge

Practice chỉ dùng hai shared session wrappers hiện có: **Free** và **Challenge**. Bốn exercise kinds local được phép dùng là **Multiple Choice**, **Tap Rhythm**, **Listen & Identify** và **Count the Beat**. Không thêm shared session mode hoặc exercise kind thứ năm.

Free dùng để lặp lại, xem feedback và thử lại không áp lực điểm. Challenge dùng set có cấu hình và có thể giới hạn số exercise theo policy đã có; nó vẫn gửi tối đa một shared answer cho mỗi exercise hoàn tất. Replay, retry không chấm lại và technical abort không thành wrong answer.

| Exercise kind | Lesson/Worked example | Practice | Assessment |
|---|---|---|---|
| Multiple Choice | Hỏi value, meter, rest, pulse, tie role hoặc grouping | Choice pool distinct, feedback giải thích concept | Choice identity canonical; một answer toàn exercise |
| Tap Rhythm | Từ Level 3: nhìn pattern và thực hành onset, không đo hold duration | Free/Challenge actual tap timestamps đối chiếu expected onset timestamps | One-to-one matched/early/late/missing/extra và Timing Accuracy (%) riêng; không per-tap shared score |
| Listen & Identify | Minh họa duration-aware sound, rest silence, tie gate | Replay không đổi score; chỉ dùng item audibly distinguishable | Chấm choice theo canonical signature; duration/tie/rest diagnostics |
| Count the Beat | Minh họa pulse, subdivision, group count và accent | Grid/sequence practice giữ meter label | Chấm derived coordinates và grouping; 3/8 không compound |

### 5.3. Assessment: configured sets và một whole answer

Assessment là một configured set, không phải một score cho từng tap, từng cell hoặc từng subpart. Một completed exercise tạo đúng **một whole answer** tại shared boundary. Kết quả shared giữ nguyên: **đúng = +10, sai = +0**. Diagnostics có thể chi tiết hơn, nhưng không làm phát sinh partial credit, per-tap points hoặc shared schema field mới.

Mỗi configured assessment set nên khai báo logic các nhóm sau:

| Nhóm cấu hình | Nội dung cần cân bằng hoặc khóa |
|---|---|
| Meter coverage | Theo level scope; Level 3 phải có 2/4, 3/4, 4/4; Level 6 phải có cả 3/8, 6/8, 9/8; Bonus 2/2 chỉ xuất hiện khi set chọn Bonus |
| Exercise-kind coverage | Bốn kinds toàn module, phân bổ theo D-07: L1/L2 MC+Listen Identify, Tap từ L3; MC vẫn core, không bắt buộc đủ bốn tại mọi Level |
| Concept coverage | Value, rest, subdivision, dot, tie, pulse, group count, accent và meter distinction theo level |
| Onset coverage | Target attacks, rests, tie continuation suppression, tap timing và missing/extra/early/late nếu kind cho phép |
| Duration coverage | Exact written duration, dotted duration, tie span, rest duration và duration-aware listening |
| Difficulty budget | Số nguồn khó tối đa, grid, vocabulary và cross-pulse/cross-bar tie policy của level |
| Answer policy | Choice identity/canonical signature/derived coordinates; duplicate answer và equivalent distractor bị loại |
| Seed/policy | Seed và policy version bất biến trong set để có thể tái lập; không claim đây là runtime contract hiện tại |

“Balanced” nghĩa là có chủ đích và được cấu hình, không nhất thiết chia đều máy móc theo số signature. Assessment phải ưu tiên capability và learning objective. Với Level 6, balance phải cho thấy ba signature và ba cách hiểu khác nhau; không được xem 3/8, 6/8, 9/8 là ba biến thể cùng một compound meter.

## 6. Generation requirements

### 6.1. Exact fill và reuse validated data

Generator tương lai phải nhận một configuration đã giới hạn theo level/unit, chọn dữ liệu từ vocabulary đã validate, fill measure theo duration descriptors và chỉ phát hành exercise sau khi exact-fill validator chấp nhận. Không tạo một tick cache hoặc onset list độc lập làm nguồn sự thật thứ hai. Segment duration, rest, dot, tie và onset phải tiếp tục tuân theo canonical model hiện có.

Generator phải reuse các fixture, duration rules, tie rules, answer signatures và meter metadata đã được validate khi chúng tồn tại. Không copy lại một phiên bản gần giống rồi để hai nguồn drift. Nếu data chưa đủ cho một set hợp lệ, generator phải fail closed hoặc báo thiếu capacity; không bù bằng item sai meter, item equivalent hoặc item không validate.

### 6.2. Seed, policy version và deterministic behavior

Mỗi generation request tương lai phải có seed và policy version logic. Cùng configuration, cùng seed và cùng policy version phải tạo cùng exercise ordering/content hoặc cùng canonical result theo quy tắc đã định. Mở rộng default pool bằng 3/8, 9/8 hoặc 2/2 có thể đổi output của seed cũ; quyết định preserve legacy output hay ghi nhận policy expansion là **một quyết định tương lai**, không bắt buộc phải tạo framework mới trong tài liệu này.

Generator không được âm thầm fallback sang meter khác để đạt quota. Nếu policy yêu cầu một meter nhưng pool hợp lệ không đủ, set phải fail closed và ghi lý do ở local generation diagnostic.

### 6.3. Choice-pool uniqueness và ambiguity guards

Choice pool phải được kiểm tra theo meter và canonical answer identity trước khi hiển thị. Các quy tắc bắt buộc:

1. Không reuse cùng canonical answer để giả làm distractor khác.
2. Không coi hai pattern là khác nhau chỉ vì capacity bằng nhau, label khác nhau hoặc presentation khác nhau khi target task không phân biệt được.
3. Không dùng item cùng capacity để xóa identity: 3/8 `720` không được đổi thành một compound pulse `720`; 6/8 `1440` không được coi là sáu quarter-like pulses; 2/2 `1920` không được coi là 4/4 chỉ vì bar capacity bằng nhau.
4. Với pool 3/8 nhỏ, nếu không đủ choice distinct và validated thì **fail closed**. Không nới uniqueness, không lấy filler từ 6/8/9/8, không lặp đáp án dưới label mới.
5. Việc một lesson so sánh cả ba meter Level 6 **không** được relax choice-pool guard. Comparison được phép ở content/prompt đã cấu hình, không phải trong mỗi answer pool thiếu distinct options.
6. Distractor equivalent về onset, duration, rest/tie semantics hoặc target audio phải bị loại theo task tương ứng.

### 6.4. Meter-aware generation

Generation policy phải dùng explicit meter metadata: bar capacity, pulse ticks, pulse starts, group count, pulse unit và accent model. Không suy pulse từ numerator/denominator đơn lẻ. Fine-grid budget, subdivision index, onset target và difficulty phải tính theo pulse của meter.

Generation metadata tương lai phải thể hiện đúng quy ước đã chốt:3/8 `Sww`,6/8 `Sww|Mww`,9/8 `Sww|Mww|Mww`; compound-beat accents6/8 `S-M`,9/8 `S-M-M`. Structural labels không làm thay đổi exact duration, onset, rest silence hoặc tie suppression, không tự biến thành explicit segment articulation. Không thay generator code hoặc schema trong update tài liệu này.

## 7. Assessment diagnostics và mapping — historical exercise-kind references where conflicting

> Diagnostics that refer to Listen & Identify, Count the Beat, or the earlier Tap-from-Level-3 placement are retained as historical proposals, not additional active activities.

Diagnostics là local explanation sau khi whole answer đã được xác định. Một item có thể có nhiều diagnostic flags nhưng chỉ có một shared correctness value.

| Diagnostic | Ví dụ dữ liệu cần giải thích | Không được làm |
|---|---|---|
| Concept | Learner nhầm quarter/eighth, group count hoặc half pulse | Không tạo partial shared points |
| Onset | Missing, extra, early, late, tie continuation bị tap nhầm | Không tính mỗi tap là một shared answer |
| Duration | Dotted value, rest span, tie gate hoặc written duration sai | Không sửa đáp án thành onset-only cho Listen & Identify |
| Meter | Nhầm 3/8 với 6/8, 6/8 với 9/8 hoặc 2/2 với 4/4 | Không phân loại 3/8 là compound |
| Grouping/accent | Sai số group, pulse unit hoặc teaching accent model Level 6 | Không đồng nhất phách đơn với phách phức hoặc gán Mạnh cho mọi group start |
| Technical confidence | Audio interruption, clock uncertainty, visibility/route change | Không biến attempt kỹ thuật không đáng tin thành wrong learner result |

Tap Rhythm tiếp tục onset-only và là practical performance từ Level 3. Bài nhìn pattern, theo metronome/reference timing của cấu hình đã duyệt, tap màn hình tại onset, rồi nhận Timing Accuracy (%) riêng với Exercise Points. Không dùng choice ID hoặc tap count làm thay thế timestamp evaluation; không tuyên bố tap chứng minh learner giữ note đủ duration. Listen & Identify phải dùng duration-aware validated data, rest silence và tie continuation không attack. Count the Beat phải so sánh derived pulse/subdivision coordinates, không dùng một ordinal whole-bar đơn giản để làm mất grouping.

## 8. Release/acceptance wording cho tương lai — historical proposal

> The following future criteria describe the pre-2026-11-12 product and timing proposal where they conflict with active policy; they are not test results or a current release gate.

Các test và acceptance dưới đây chỉ là **đề xuất tương lai, chưa chạy và chưa pass**. Release chỉ được xem xét sau khi curriculum, generation, validation, exercise flows, accessibility và technical no-penalty behavior được phê duyệt. Không dùng tài liệu này để tuyên bố source hiện tại đã hỗ trợ curriculum mới.

Acceptance proposal tối thiểu phải chứng minh: mỗi level/Bonus có đủ Lessons, Practice, Assessment; bốn exercise kinds vẫn là bốn kinds hiện có; Lesson không graded; Practice chỉ dùng Free/Challenge; Assessment một whole answer +10/+0; exact-fill và validated-data reuse; deterministic same seed/config/policy; fail-closed small 3/8 pool; no equal-capacity identity collapse; Level 6 progression đủ sáu bước; 3/8 simple triple và 6/8/9/8 compound identities không bị trộn; Bonus 2/2 optional nhưng supported; historical test count không bị ghi là fresh result.

## 9. Required future change paths (path list only; historical plan)

> The path list and future-phase language below describe the earlier implementation plan, not current route/activity status.

Các path dưới đây chỉ là danh sách touchpoints tương lai để review, không phải lệnh chỉnh sửa trong nhiệm vụ này:

- `client/src/modules/rhythm-training/curriculum.ts`
- `client/src/modules/rhythm-training/generation/levels.ts`
- `client/src/modules/rhythm-training/generation/generator.ts`
- `client/src/modules/rhythm-training/generation/choices.ts`
- `client/src/modules/rhythm-training/generation/answerSignatures.ts`
- `client/src/modules/rhythm-training/rhythm/meters.ts`
- `client/src/modules/rhythm-training/rhythm/validate.ts`
- `client/src/modules/rhythm-training/validation/multipleChoice.ts`
- `client/src/modules/rhythm-training/validation/tapMatcher.ts`
- `client/src/modules/rhythm-training/validation/listenIdentify.ts`
- `client/src/modules/rhythm-training/validation/countBeat.ts`
- `client/src/modules/rhythm-training/validation/diagnostics.ts`
- `client/src/modules/rhythm-training/docs/Generation-and-Assessment-Requirements.md`

## 10. Open questions và giới hạn phê duyệt — historical D-07 list

> The following D-07 list predates the approved Formula B, T2-B, primary DP, clock/collection/drain, shared scoring, and replay decisions; do not treat those approved items as pending. Quiz count/quotas, readiness/pilot thresholds, and effectiveness claims remain unapproved; existing quota status is unchanged.

D-07 đã chốt Multiple Choice core, Tap từ Level 3 và progressive direction qua Level 4/5/6/Bonus. Các tham số còn mở không chặn ghi nhận placement này. **PENDING TECHNICAL SPECIFICATION AND APPROVAL:** exact Timing Accuracy percentage formula; tolerance windows; performance grades; continuous metronome trong mọi bài; bỏ continuous guidance ở advanced; count-in/replay limits; separate reference performance availability; device-latency compensation/calibration. Các numeric hypotheses cũ không phải defaults được D-07 phê duyệt.

Shared scoring vẫn một bài correct +10, incorrect +0, no rescore. Timing Accuracy (%) không thay shared accuracy/averageResponseTimeMs, không thêm per-tap points hoặc shared field. Kết quả practical phải có matched/early/late/missing/extra theo actual-vs-expected timestamps và one-to-one matching; equal tap count alone cannot establish correctness.

Quy ước nhạc lý Level 6 và hierarchy giữ nguyên. Ba presentation policies đã APPROVED: 3/8 móc đơn flag riêng; 6/8 beam 3+3 và 9/8 beam 3+3+3 không qua phách phức; App Voice Counting tiếng Anh mặc định, Visual Counting hiện số để tự đếm bằng ngôn ngữ tùy ý, Metronome tick; accent dạng chữ hoặc ký hiệu với màu tùy chọn đủ tương phản/khả năng nhận biết, không bắt buộc phối hợp cả ba. Chỉ những secondary-beam/rest/mixed cases và voice details chưa được mô tả cùng quota/assessment/tempo/pilot/readiness/legacy-seed details còn mở. Không tạo exercise/session modes mới, không đổi meter/schema/curriculum hoặc mở phase code mới.

**Kết luận trạng thái:** tài liệu này chỉ bổ sung yêu cầu logic cho generation và assessment của curriculum đã duyệt. Không có source, test, TS/TSX/JS/CSS/JSON/DB/infrastructure/dependency, shared architecture, Note Reading, UI, catalog, audio, metronome, MIDI, mic, Phase 3, deploy hoặc repository mới nào được thay đổi bởi tài liệu này.

## Nguồn nội bộ đã dùng

- `approved_curriculum_request` — curriculum, Level 6 progression, accent strings, PPQ/meter values và implementation boundary.
- `Rhythm-Training-V1-Six-Meter-Specification.md` — existing four exercise kinds, exact-fill/generation policy, one-answer scoring, diagnostic separation, meter semantics và legacy/current-status caveats.
