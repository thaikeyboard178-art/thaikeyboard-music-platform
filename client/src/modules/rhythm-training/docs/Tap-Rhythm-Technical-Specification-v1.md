# Tap Rhythm V1 — Technical Specification, Phase 4A

**Trạng thái: Formula B đã được Owner chọn cho phép đo Timing Accuracy; mọi window/threshold/candidate vẫn CHỜ OWNER APPROVAL.** Pilot tại Section 9 chỉ là mô phỏng offline, không phê duyệt thông số hoặc cho phép bắt đầu Phase 4B. Các thông số lịch sử trong specification cũ vẫn là giả thuyết, không phải defaults. Tác giả: Manus AI. Baseline đã audit: `99da0de1a0ff77cfa84ae4acee9be67f447241fd`.

## 1. Audit và phạm vi tái sử dụng

`curriculum/curriculum.ts` đã có bốn exercise kinds và placement Tap: Level 1–2 không có Tap; Levels 3–6 có Tap trong sections hiện hữu; Bonus 2/2 có Tap optional trong Practice, không tự thêm vào Lessons/Assessment. `generation/levels.ts` có đúng vocabulary: Level 3 eighth-grid trong 2/4, 3/4, 4/4; Level 4 dotted values và ties; Level 5 sixteenth-grid và tổ hợp nâng cao; Level 6 3/8, 6/8, 9/8; Bonus half-note pulse. Quota Assessment Level 6 chưa được duyệt. Không đổi curriculum, meters hoặc exercise allocation.

Tái sử dụng `deriveRhythmTimeline`, `soundingSpans`, `ticksToSeconds`, generator/policies và `audio/plan.ts`. Phase 3 `RhythmAudioTransport.getReferenceTiming()` trả `generation`, `anchorTime`, `expectedOnsets[{id,tick,audioTime}]` khi đang playing; targets vẫn có khi chỉ bật metronome lane. Rest và tie continuation không tạo target. Phase 3 đã có state/abort reason và hủy generation khi stop/replay/interruption; chưa có Tap capture, clock bridge hoặc matcher.

`exercises/scoring.ts` hiện chỉ nhận Multiple Choice/Count the Beat; `features/training/session.ts` đã giữ +10/+0 và duplicate guard. Sau approval chỉ cần mở rộng Rhythm-owned exercise union/evaluator dispatch cho Tap và dùng shared session như cũ; không viết lại shared scoring. Timing Accuracy không đưa vào `TrainingResult.accuracy` hoặc `averageResponseTimeMs`. 632 tests của Phase 3 là bằng chứng lịch sử; các test ở Section 9 chỉ kiểm thử pilot offline, không phải Tap runtime tests.

## 2. Clock architecture và timestamp capture đề xuất

Trong native `pointerdown` hoặc `keydown` Space không-repeat, ghi ngay raw `event.timeStamp`, `performance.now()` tại handler entry, capture sequence, source và attempt/generation ID. Dùng event timestamp làm input time; handler time chỉ là arrival diagnostic. Không dùng React render/setState, `Date.now()` hoặc thời điểm phát monitor click. `Event.timeStamp` là thời gian tạo event, không phải phép đo chính xác lúc ngón tay chạm thiết bị; độ phân giải có thể bị browser giảm [1] [2].

Với cùng document/global, chuẩn hóa về performance origin của document. Input chuyển từ worker/window khác cần chuyển origin bằng `performance.timeOrigin`; không so sánh trực tiếp hai origin [3]. Giữ sequence để xử lý timestamps bằng nhau do precision reduction; không sửa timestamp bằng cách cộng epsilon. Timestamp không hữu hạn, origin không xác định hoặc đảo thứ tự vượt precision uncertainty làm attempt technical/ungraded theo policy cần duyệt, không âm thầm sort/sửa để cứu điểm.

**Clock bridge khuyến nghị:** lấy các cặp hợp lệ từ `AudioContext.getOutputTimestamp()`. Với `C=contextTime` giây, `P=performanceTime` ms, target audio time `A` và tap performance time `T`:

```text
expectedPerformanceMs(A) = P + 1000 × (A − C)
tapAudioSeconds(T)        = C + (T − P) / 1000
signedErrorMs            = T − expectedPerformanceMs(A)
```

Hai cách so sánh tương đương khi dùng cùng sample. `currentTime` tiếp tục là clock scheduling; không lấy handler-time currentTime làm tap time vì clock này tiến theo render blocks và dừng khi context suspended [4]. Output timestamp liên hệ output-frame time với performance time, nhưng vẫn là estimate; extrapolation càng xa sample càng kém chính xác. Không coi `currentTime − contextTime` là phép đo output latency [5] [6].

Một Tap-owned wrapper có thể cung cấp `contextFactory` cho transport và giữ reference tới **chính Rhythm AudioContext đó** để đọc clock APIs; không tạo context thứ hai, không dùng context của Note Reading, không cần đổi Phase 3 API hiện có. Lưu reference snapshot khi armed/playing vì `getReferenceTiming()` trả null sau completed/aborted. Refresh output samples gần events, lưu sample được dùng để evaluation tái lập; không đổi kết quả đã chốt bằng sample thu sau feedback. Cặp zero/zero lúc graph chưa render không được dùng làm bằng chứng mapping [6].

Event đến handler trễ vẫn dùng timestamp gốc; `arrival − eventTime` không phải physical input latency và không được trừ vào signed error. Chỉ nhận event cùng generation trong capture interval đã duyệt. Event sau technical abort/stale generation bị loại, không làm sống lại attempt. Collection start/end, khoảng tiếp nhận early tap và bounded drain cho delayed delivery cần owner chốt; chưa đặt giới hạn ms. Audio completed tự nhiên không đồng nghĩa technical abort: wrapper có thể finalize dữ liệu hợp lệ bằng snapshot đã lưu sau khi đóng collection.

## 3. Latency strategy và calibration

Browser scheduling: tái sử dụng absolute currentTime scheduling; missed horizon là technical abort, không dồn late sources. Input path: quan sát được event creation và handler arrival, không đo được hardware contact-to-event delay. Output path: `baseLatency` mô tả xử lý graph-to-host; `outputLatency` là estimate host-to-device và có thể đổi theo route. Chúng không đo acoustic latency tới tai hoặc toàn bộ input/output fairness [7] [8].

**Khuyến nghị chưa duyệt:** ưu tiên output-timestamp bridge, không cộng thêm base/output latency lên mapping đó. Không tự trừ một device offset vào learner taps. Khi mapping thiếu/stale/không ổn định, chỉ cho practice diagnostic hoặc technical/ungraded, không cho graded software fallback mặc định. Fallback ghép `currentTime` với `performance.now()` có thể dùng để mô tả software timing, nhưng không thể giả định output latency bằng zero; graded fallback và mọi estimated compensation cần approval riêng.

Không bắt buộc learner calibration trong V1 là phương án khuyến nghị: median self-tap offset lẫn learner bias với device delay, không chứng minh physical latency. Phương án khác là optional calibration ngoài graded attempt, giữ offset cố định cho attempt sau và invalidate khi đổi route; vẫn phải gắn estimated, không measured. Không fit offset từ chính bài đang chấm. Muốn xác nhận physical latency phải có external/device measurement; không dùng browser automation làm bằng chứng đó. Freshness, clock stability và confidence criteria đều chưa có numeric thresholds.

## 4. Ordered one-to-one matching đề xuất

Inputs là ordered expected onsets và accepted taps trong cùng clock/generation. Không lấy notation segments, pulse ticks, rest hoặc tie continuation làm additional targets; không chấm hold duration. Định nghĩa `Wpass(i)` là cửa sổ chấp nhận timing và `Wassoc(i)` là cửa sổ rộng hơn để liên kết diagnostic near-miss; cả hai pending.

Khuyến nghị sequence-alignment dynamic programming với ba transitions: pair một target/tap đủ điều kiện association, bỏ một target thành missing, hoặc bỏ một tap thành extra. Assignment không giao chéo thứ tự và không tái dùng event. Objective đề xuất theo thứ tự: tối đa số pair trong Wpass; sau đó tối đa diagnostic pairs trong Wassoc; sau đó tối thiểu tổng absolute error; hòa thì target index/capture sequence. Cách này không ép match xa chỉ để giảm missing, và không cho greedy match lấy tap tốt của target kế tiếp. Boundary inclusive/exclusive và tie-break vẫn cần approval.

Năm statuses đề xuất: `matched` khi pair trong Wpass; `early`/`late` khi pair ngoài Wpass nhưng trong Wassoc theo dấu error; `missing` cho target không có pair; `extra` cho tap không có pair. Matched vẫn giữ signed error/direction để feedback được một tap hơi sớm/muộn nhưng được chấp nhận. Near-miss tiêu thụ đúng một target và một tap nhưng không được tính là on-time hit. Ngoài Wassoc, báo missing target và extra tap riêng; không cưỡng ép chọn target gần nhất.

Không tính compatibility click sau pointerdown; bỏ Space `repeat`; chống duplicate capture của cùng native event, không deduplicate hai physical taps chỉ vì timestamps bằng nhau. Multi-pointer behavior cần chốt. Pause/resume/replay/tempo change của graded Tap phải invalidate attempt và re-arm với generation mới; không nối hai audio anchors để tiếp tục chấm như một attempt. Pointercancel, blur/hidden, context interruption, observable route change hoặc starvation không thành wrong answer. Replay/retry là ungraded và không rescore shared exercise.

Đây là proposed Tap-wrapper handling: transport hiện không bắt pointercancel/blur và không có tempo-change API; nó bắt visibility/context/observable sink changes và scheduling failures. `pause()` chỉ hủy generation rồi chuyển paused, không đặt technical abort reason. Wrapper sau approval phải invalidate capture khi người học pause/đổi tempo; retry graded không được tự sinh thêm shared answer.

## 5. Timing Accuracy: hai formula và khuyến nghị

Gọi `N` là tổng expected targets, `K` là tổng accepted physical taps trong capture interval, `TP` là matched trong Wpass. Bỏ duplicate software delivery/stale events trước khi đếm K; không bỏ physical extra taps để tăng điểm. Tính trên **toàn exercise**, không lấy trung bình không trọng số của bar percentages.

**A — target-hit rate:** `Accuracy_A = 100 × TP / N`. Missing và early/late ngoài Wpass không có credit; extra chỉ báo riêng nên không hạ percentage. Ưu điểm: dễ hiểu “bao nhiêu onset đã tap đúng”. Nhược điểm: tap thừa nhiều nhưng hit đủ targets vẫn có thể 100%; correctness policy phải xử lý extra riêng. Early/late trong Wpass nhận full credit, không có continuous closeness credit.

**B — event F1:** `Accuracy_B = 100 × 2 × TP / (N + K)`. Tương đương F1 precision/recall: nếu Q là diagnostic near-misses, M missing và X extra thì `FN=M+Q`, `FP=X+Q`; một near-miss không nhận TP và đóng góp một thất bại ở mỗi event population, không bị trừ shared points hai lần. Missing, extras và ngoài-tolerance đều giảm kết quả. Ưu điểm: chống tap-spam trong một percentage, không cần penalty weights tùy ý. Nhược điểm: khó giải thích hơn hit rate; vẫn nhảy tại window boundary và không phân biệt mức lệch của các hits trong cùng window.

**Owner đã chọn Formula B cho phép đo Timing Accuracy; không thay đổi formula này trong pilot.** A chỉ còn là phương án so sánh lịch sử, không phải lựa chọn đang chờ. Với `N>0, K=0`, B bằng **0%**, không ungraded chỉ vì không có taps. Với `N=0`, trả not-applicable/ungraded, không 0% hay 100%; technical abort trả accuracy null và reason, không grade. Ví dụ counts tính bằng số nguyên: `N=4, K=5, TP=4` cho B=800/9% (hiển thị rounding chỉ sau aggregate); quy tắc rounding display vẫn pending.

Timing Accuracy không tự quyết định Exercise Points. Owner cần chọn correctness gate: mọi targets trong Wpass và không extras, hoặc accuracy ≥ threshold với một extra/missing allowance đã duyệt. Chưa có pass percentage/allowance/grade nào được áp dụng. Chỉ một completed graded answer được chuyển thành correct +10 / incorrect +0; technical abort, replay và retry không tạo answer/điểm mới.

## 6. Tolerance và reference/metronome options

**Tolerance T1 — fixed milliseconds:** một Wpass cố định, với diagnostic Wassoc riêng. Dễ giải thích và test, nhưng cùng giá trị không phản ánh dense sixteenths, thay đổi BPM hoặc pulse unit; có nguy cơ association overlap. Chỉ dùng làm pilot comparator, không khuyến nghị làm policy duy nhất cho cả curriculum.

**Tolerance T2 — local-grid capped relative windows, khuyến nghị chưa duyệt:** `P=60/pulseBpm` giây; `S=P × gridTicks/pulseTicks`. Dùng eighth grid ở Level 3–4 và Level 6/Bonus, sixteenth ở Level 5 theo policies hiện hữu. Gọi G là min của S và positive adjacent target gaps có sẵn; thiếu neighbor dùng S, và long rests không làm G lớn hơn S. Đề xuất:

```text
Wpass(i)  = min(Cpass,  α × G(i))
Wassoc(i) = min(Cassoc, β × G(i))
0 < α ≤ β < 1/2 ; Cpass ≤ Cassoc
```

Đơn vị G/C/windows thống nhất là seconds, convert ms đúng một lần ở diagnostics. Pulse-quarter/eighth/dotted-quarter/half lấy từ canonical meter, không hardcode quarter BPM. T2 phản ánh tempo/density mà không mở cửa sổ chỉ vì onset cách xa qua rest. Đánh đổi: Level 5 còn bị giới hạn sixteenth grid kể cả pattern có ít sixteenths; owner có thể chọn actual-local-density thay legal-grid density nếu pilot cho thấy quá chặt. Mọi α, β, caps, symmetry/boundaries và density rule đều là **PROPOSED, chưa có số được duyệt**. Không tự nâng Level 6 lên sixteenth vocabulary.

Device/input uncertainty là confidence metric riêng: precision quantization, mapping freshness/residuals và delayed arrival không phải measured physical latency bounds. Khuyến nghị không tự widen Wpass để thưởng cho thiết bị kém. Nếu confidence chưa đủ hoặc uncertainty khiến kết luận ở window boundary không chắc, technical/ungraded thay vì đoán đúng/sai; cách ước tính uncertainty và ngưỡng invalidation cần approval.

**Reference choices:** continuous technical-pulse metronome; finite count-in rồi im lặng; separate ungraded reference performance; hoặc giảm guidance ở advanced items. Có thể kết hợp, nhưng count-in length, collection boundary, replay limits, pattern reference có bắt buộc không, và level-guidance matrix đều chưa chốt. Khuyến nghị pilot continuous pulse + explicit count-in cho introductory Tap, cho reference trước attempt dưới dạng ungraded; advanced removal là cấu hình thử nghiệm cần duyệt, không tự bật theo Level. Metronome vẫn tick, không voice syllables; voice assets còn unavailable từ Phase 3.

## 7. Edge cases và test strategy sau approval

Algorithm tests dùng deterministic clocks: exact/early/late, window boundaries, zero taps, zero targets, missing/extra, software duplicates và physical double taps, một tap giữa hai targets, order-preserving ties, rests, tied continuation/cross-bar tie, dotted values, dense sixteenths và multibar aggregation. Chạy cả 2/4, 3/4, 4/4, 3/8, 6/8, 9/8, 2/2 đúng pulse BPM; Tap Level 1–2 phải bị từ chối và Bonus không tự thêm vào Assessment.

Clock/lifecycle tests: cùng/cross-origin time base, coarse/equal/nonmonotonic/invalid timestamps, event arrival trễ, mapping zero/stale/drift, pending resume, natural completion với cached references, collection close/drain boundary, tempo change, generation/replay/retry, pointercancel/blur/hidden/interruption/starvation. Assert abort không answer, replay không rescore, correct +10 / incorrect +0, one shared answer và shared regression không đổi.

Browser tests sau approval dùng actual pointerdown/Space timestamp và handler entry, so sánh với real AudioContext output pairs. Browser automation có thể kiểm chứng event/clock pipeline, không chứng minh physical touch/acoustic latency. Mobile/browser/device matrix và external latency measurements chỉ được ghi PASS khi thực sự đã thử thiết bị. Không kết luận Bluetooth fairness từ fake clocks hoặc Chromium headless.

## 8. Quyết định cần owner phê duyệt và điểm dừng

1. **Clock/confidence:** primary output-timestamp bridge; có cho graded fallback không; sample validity/freshness và collection/drain boundaries; invalid timestamp behavior.
2. **Latency:** no mandatory learner calibration như khuyến nghị, hay optional calibration; estimated-compensation/fallback có được phép không và cách invalidate route changes.
3. **Matching/input:** ordered DP objective, Wpass/Wassoc semantics, early/late near-miss classification, boundaries/tie-break; native-event deduplication và multi-pointer policy.
4. **Metric/scoring:** Formula B đã được Owner chọn; còn pending rounding, no-target/ungraded presentation và strict complete-hit gate hay threshold/allowances riêng cho +10/+0.
5. **Tolerance:** T1 hay T2 (T2 là hướng được đưa vào pilot, chưa phải production approval); legal-grid hay actual-local density; α/β/caps, uncertainty estimation và technical-ungraded criteria. Chưa có numeric production parameters.
6. **Guidance:** count-in length, continuous metronome, reference playback/replay limits, advanced guidance và capture interval cho từng cấu hình; không đổi exercise-kind allocation.

**Đã thực hiện:** audit source và clock references; owner đã chọn Formula B; chạy pilot offline được mô tả ở Section 9. **Chưa thực hiện:** timestamp capture prototype, clock bridge code, production matcher, production windows, Tap adapter/scoring, reference/count-in behavior hoặc Tap runtime test. Không sửa Phase 1–3, production source/tests/UI/routes/database/infrastructure; không deploy. Dừng trước Phase 4B và chờ approval cho các lựa chọn cùng numerical parameters thực sự cần thiết; Formula B approval không phê duyệt matcher hoặc graded Tap.

## 9. Phase 4A.1 — Formula B/T2 offline pilot (non-production)

### Phương pháp và giới hạn bằng chứng

Đây là mô phỏng deterministic để so sánh các đề xuất kỹ thuật, không phải dữ liệu của người học, không phải phép đo thiết bị và không phải bằng chứng về độ công bằng/latency ngoài đời. Mọi kết quả bên dưới là **output của pilot harness**, không phải production behavior. Pilot code nằm riêng dưới `pilot/`, không được export/import vào module API hoặc ứng dụng.

Onset ticks lấy từ các pattern hai measure, kiểm tra bằng production `validateRhythmPattern` và `deriveRhythmTimeline`; chuyển sang giây bằng production `ticksToSeconds` và pulse của `deriveMeter`. Các pattern gồm sparse, dense theo grid của track và mixed-stress (rest, dotted-eighth + sixteenth, tie qua barline). Mixed-stress được dùng làm **canonical stress test**, không mở rộng vocabulary/curriculum Level 6 hoặc Bonus. Mỗi meter chạy slow/medium/fast theo pulse unit đã duyệt: 2/4, 3/4, 4/4 dùng quarter BPM 50/79/108; 3/8, 6/8, 9/8, 2/2 dùng pulse BPM 40/56/72.

Ma trận gồm `10 candidates × 7 meters × 3 tempi × 3 pattern profiles = 630 rows`, với 6,510 target-instances và 19,740 candidate-relative classification checks. Mỗi row cũng nhận fixed positive error probes `20/45/80/120 ms`. “Classification rate” chỉ đo việc harness phân loại đúng những trường hợp synthetic được dựng tương đối với chính Wpass/Wassoc của candidate; **100% không phải accuracy của người học**, và fixed-ms outputs chỉ là category observed vì chưa có tolerance gold label được duyệt.

### Candidate sets (đều chưa được duyệt)

| Candidate | Model | Pass/association parameters | Basis for comparison |
|---|---|---|---|
| T1-50 / T1-75 / T1-100 | Fixed milliseconds | Wpass ±50/75/100 ms; Wassoc ±100/150/200 ms | Ba baseline từ hẹp đến rộng; Wassoc gấp đôi Wpass để quan sát ambiguity/overlap. |
| T2-A conservative | T2 symmetric | α=.20, β=.35; Cpass=35 ms; Cassoc=70 ms | Candidate hẹp hơn để kiểm tra miss/near-miss trade-off. |
| T2-B balanced | T2 symmetric | α=.30, β=.40; Cpass=50 ms; Cassoc=80 ms | Điểm so sánh trung tâm; không được xem là default. |
| T2-C wider | T2 symmetric | α=.40, β=.45; Cpass=70 ms; Cassoc=100 ms | Gần giới hạn β<.5, để kiểm tra nguy cơ overlap khi nới rộng. |
| T2-B asymmetric | T2 asymmetric | Như B, scale early=.75, late=1.10 | Kiểm tra hướng lệch có chủ ý; không có dữ liệu để kết luận bias thật của thiết bị/người học. |

Trong mỗi họ T2, so sánh `legal-grid: G=S` với `actual-local: G=min(S, các khoảng cách onset lân cận dương)`. Không có candidate số nào được chọn làm production threshold.

### Tổng hợp kết quả

Ở mỗi candidate-row, composite diagnostic case có một near-miss, một missing target và một extra physical tap; đây là cách xác minh Formula B đã chọn, không phải thử nghiệm hành vi. Gộp 63 rows mỗi candidate cho cùng counts: `TP=525, M=63, X=63, Q=63, N=651, K=651`, do đó `Accuracy_B=100×2×525/(651+651)=80.65%`. Exact-only baseline là 100% (651/651). Các counts giống nhau giữa candidates vì composite case được dựng từ từng candidate’s own windows; **không dùng score này để xếp hạng hay chọn candidate**.

| Candidate group | Association-window overlaps | Midpoint probes assigned | Windows equal to legal-grid | Candidate-relative scenario checks |
|---|---:|---:|---:|---:|
| T1-50 ms | 151 | 6 | 651/651 | 100% |
| T1-75 ms | 313 | 13 | 651/651 | 100% |
| T1-100 ms | 429 | 17 | 651/651 | 100% |
| T2-A/B/C legal-grid | 4 / 4 / 7 | 0 | 651/651 | 100% |
| T2-A/B/C actual-local | 0 / 0 / 0 | 0 | 637/651, mỗi candidate | 100% |
| T2-B asymmetric actual-local | 0 | 0 | 633/651 | 100% |

T1 overlap counts là các adjacent-target intervals có association windows chồng nhau trên toàn matrix; midpoint assigned là các midpoint probes thực sự được ghép. Với T2 legal-grid, các overlap xảy ra trong mixed-stress sixteenth patterns ngoài Level 6/Bonus vocabulary: A/B tại 6/8 fast, 9/8 fast, 2/2 medium và fast; C còn xuất hiện ở 6/8/9/8 medium. T2 actual-local loại các overlap đó bằng cách giới hạn G theo khoảng cách onset. Trong sparse/dense patterns theo grid curriculum, các windows legal-grid và actual-local không khác; 14/651 khác biệt của symmetric actual-local (18/651 ở asymmetric B) đến từ các stress onsets nhỏ hơn grid, không phải thay đổi curriculum.

Candidate-relative classification rates đều 100% theo các nhãn exact, early/late-inside, early/late-near, missing, physical-double, software-duplicate và extra: ví dụ T2-B actual-local đạt exact 651/651; mỗi nhóm early-within, early-near, late-within, late-near, missing, physical-double và software-duplicate 180/180; extra 63/63. Equal timestamps của hai native event khác nhau được giữ là hai physical taps; redelivery lặp native event ID bị deduplicate trong pilot. Kết quả này kiểm tra tính nhất quán của harness, không phải sensitivity/specificity thực nghiệm.

Balanced T2 actual-local — composite counts theo meter (mỗi dòng gộp 9 rows: 3 tempi × 3 patterns; K=N):

| Meter (pulse unit) | TP | M | X | Q | N=K | Formula B |
|---|---:|---:|---:|---:|---:|---:|
| 2/4 (quarter) | 54 | 9 | 9 | 9 | 72 | 75.00% |
| 3/4 (quarter) | 93 | 9 | 9 | 9 | 111 | 83.78% |
| 4/4 (quarter) | 132 | 9 | 9 | 9 | 150 | 88.00% |
| 3/8 (eighth) | 21 | 9 | 9 | 9 | 39 | 53.85% |
| 6/8 (dotted quarter) | 54 | 9 | 9 | 9 | 72 | 75.00% |
| 9/8 (dotted quarter) | 93 | 9 | 9 | 9 | 111 | 83.78% |
| 2/2 (half) | 78 | 9 | 9 | 9 | 96 | 81.25% |

### Fixed 45 ms error: tempo/grid sensitivity

Mỗi ô là category của một late tap ở `+45 ms` trong dense legal-grid pattern; đây là candidate output, chưa có gold label để gọi là correct/incorrect. So sánh T2-B symmetric actual-local: `pass` = matched trong Wpass; `near` = late trong Wassoc nhưng ngoài Wpass.

| Meter (pulse BPM slow/medium/fast) | 45 ms status slow / medium / fast |
|---|---|
| 2/4 (quarter 50/79/108) | pass / pass / near |
| 3/4 (quarter 50/79/108) | pass / pass / near |
| 4/4 (quarter 50/79/108) | pass / pass / near |
| 3/8 (eighth 40/56/72) | pass / pass / pass |
| 6/8 (dotted-quarter 40/56/72) | pass / pass / pass |
| 9/8 (dotted-quarter 40/56/72) | pass / pass / pass |
| 2/2 (half 40/56/72) | pass / pass / pass |

Ở 4/4 fast 108 BPM với sixteenth grid, `S≈138.89 ms`, nên candidate B cho Wpass≈41.67 ms và Wassoc≈55.56 ms: cùng +45 ms là near. Ở 3/8 fast 72 eighth-BPM, `S≈833.33 ms`, caps chi phối Wpass=50 ms nên cùng +45 ms là pass. T1-75 fixed baseline phân loại +45 ms là pass ở các tempo được thử, nhưng có overlap/midpoint assignments nhiều hơn. Đây là trade-off minh họa; không có tolerance truth đã duyệt để đánh giá candidate nào chấm “đúng”. Pilot dùng inclusive boundary trong harness và guard số thực 1e-12 giây; boundary policy/precision strategy cho production vẫn pending.

So sánh candidate trên 4/4 dense sixteenth-grid; mỗi chuỗi là category của cùng positive error `+20/+45/+80/+120 ms`. “late” là diagnostic near-miss; “missing” target đồng thời để lại tap extra. Slow/medium/fast lần lượt là 50/79/108 quarter-BPM.

| Candidate | Slow | Medium | Fast |
|---|---|---|---|
| T1-50 ms | matched / matched / late / missing | matched / matched / late / missing | matched / matched / late / missing |
| T1-75 ms | matched / matched / late / late | matched / matched / late / late | matched / matched / late / late |
| T1-100 ms | matched / matched / matched / late | matched / matched / matched / late | matched / matched / matched / late |
| T2-A actual-local | matched / late / missing / missing | matched / late / missing / missing | matched / late / missing / missing |
| T2-B symmetric actual-local | matched / matched / late / missing | matched / matched / missing / missing | matched / late / missing / missing |
| T2-B asymmetric actual-local | matched / matched / late / missing | matched / matched / late / missing | matched / matched / missing / missing |
| T2-C actual-local | matched / matched / late / missing | matched / matched / late / missing | matched / matched / missing / missing |

Kết quả minh họa hai giới hạn cùng lúc: T1 cố định không đổi khi BPM đổi nhưng windows chồng nhau nhiều hơn; T2 làm cùng 80 ms error thành near hoặc missing tùy tempo/caps, và cùng 45 ms thành pass/near tùy pulse/grid. Những category này là outputs của proposal, không phải khuyến nghị về tiêu chuẩn chấm đạt.

### Đề xuất có điều kiện và điểm dừng

Đề xuất đưa ra owner review: nếu tiếp tục T2, xem **T2-B symmetric actual-local** (`α=.30, β=.40, caps 50/80 ms`) làm candidate đại diện để duyệt, và giữ A/C cùng T1 làm đối chứng. Lý do kỹ thuật trong mô phỏng: actual-local không có adjacent-window overlap kể cả mixed stress, B rộng hơn A nhưng hẹp hơn C; **không có learner/device evidence để khẳng định B phù hợp hoặc công bằng**. T2-B actual-local, T1 baselines và toàn bộ caps/ratios đều vẫn CHỜ OWNER APPROVAL, không phải defaults.

Rủi ro còn lại: synthetic grid không mô hình hóa human motor distribution, event timestamp precision cụ thể trên thiết bị, physical touch latency, output latency, Bluetooth/audio-route changes, browser suspension, clock bridge residuals hoặc multi-pointer input. Kịch bản stress ngoài vocabulary chỉ kiểm tra robustness canonical, không được dùng để nới Level 6/Bonus. Pilot không tạo timestamp capture, production matcher, grades/shared points, calibration hoặc UI. Dừng tại Phase 4A.1; chờ Owner quyết định trước Phase 4B.

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp "Event timeStamp property"
[2]: https://www.w3.org/TR/hr-time-3/ "High Resolution Time Level 3"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Performance/timeOrigin "Performance timeOrigin property"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime "BaseAudioContext currentTime property"
[5]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp "AudioContext getOutputTimestamp method"
[6]: https://webaudio.github.io/web-audio-api/#dom-audiocontext-getoutputtimestamp "Web Audio API output timestamp definition"
[7]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency "AudioContext baseLatency property"
[8]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency "AudioContext outputLatency property"
